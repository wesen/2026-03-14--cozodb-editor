package notebook

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	chatstore "github.com/go-go-golems/pinocchio/pkg/persistence/chatstore"
	timelinepb "github.com/go-go-golems/pinocchio/pkg/sem/pb/proto/sem/timeline"
	"github.com/google/uuid"
	"google.golang.org/protobuf/types/known/structpb"

	"github.com/wesen/cozodb-editor/backend/pkg/cozo"
)

type Service struct {
	store      *Store
	timeline   chatstore.TimelineStore
	cozo       *cozo.DB
	sessionID  string
	runtimeKey string
}

func OpenService(appDBPath string, cozoDB *cozo.DB) (*Service, error) {
	store, err := OpenStore(appDBPath)
	if err != nil {
		return nil, err
	}
	dsn, err := chatstore.SQLiteTimelineDSNForFile(store.DBPath())
	if err != nil {
		_ = store.Close()
		return nil, err
	}
	timeline, err := chatstore.NewSQLiteTimelineStore(dsn)
	if err != nil {
		_ = store.Close()
		return nil, err
	}
	return &Service{
		store:      store,
		timeline:   timeline,
		cozo:       cozoDB,
		sessionID:  "cozodb-editor-notebook",
		runtimeKey: "cozodb-notebook",
	}, nil
}

func (s *Service) Close() error {
	if s == nil {
		return nil
	}
	if s.timeline != nil {
		_ = s.timeline.Close()
	}
	if s.store != nil {
		return s.store.Close()
	}
	return nil
}

func (s *Service) EnsureDefaultNotebook(ctx context.Context) (*NotebookDocument, error) {
	doc, err := s.store.EnsureDefaultNotebook(ctx)
	if err != nil {
		return nil, err
	}
	return s.hydrateNotebookRuntime(ctx, doc)
}

func (s *Service) CreateNotebook(ctx context.Context, title string) (*Notebook, error) {
	return s.store.CreateNotebook(ctx, title)
}

func (s *Service) GetNotebook(ctx context.Context, notebookID string) (*NotebookDocument, error) {
	doc, err := s.store.GetNotebook(ctx, notebookID)
	if err != nil {
		return nil, err
	}
	return s.hydrateNotebookRuntime(ctx, doc)
}

func (s *Service) UpdateNotebookTitle(ctx context.Context, notebookID string, title string) error {
	return s.store.UpdateNotebookTitle(ctx, notebookID, title)
}

func (s *Service) InsertCell(ctx context.Context, notebookID string, afterCellID string, kind string, source string) (*MutationResult, error) {
	cell, err := s.store.InsertCell(ctx, notebookID, afterCellID, kind, source)
	if err != nil {
		return nil, err
	}
	doc, err := s.GetNotebook(ctx, notebookID)
	if err != nil {
		return nil, err
	}
	return &MutationResult{Document: doc, Cell: cell}, nil
}

func (s *Service) UpdateCell(ctx context.Context, cellID string, kind string, source string) (*NotebookCell, error) {
	return s.store.UpdateCell(ctx, cellID, kind, source)
}

func (s *Service) MoveCell(ctx context.Context, cellID string, targetIndex int) (*MutationResult, error) {
	cell, err := s.store.GetCell(ctx, cellID)
	if err != nil {
		return nil, err
	}
	if err := s.store.MoveCell(ctx, cellID, targetIndex); err != nil {
		return nil, err
	}
	doc, err := s.GetNotebook(ctx, cell.NotebookID)
	if err != nil {
		return nil, err
	}
	return &MutationResult{Document: doc}, nil
}

func (s *Service) DeleteCell(ctx context.Context, cellID string) (*MutationResult, error) {
	cell, err := s.store.GetCell(ctx, cellID)
	if err != nil {
		return nil, err
	}
	if err := s.store.DeleteCell(ctx, cellID); err != nil {
		return nil, err
	}
	doc, err := s.GetNotebook(ctx, cell.NotebookID)
	if err != nil {
		return nil, err
	}
	return &MutationResult{Document: doc}, nil
}

func (s *Service) RunCell(ctx context.Context, cellID string) (*CellRuntimeState, error) {
	cell, err := s.store.GetCell(ctx, cellID)
	if err != nil {
		return nil, err
	}
	if cell.Kind != "code" {
		return nil, fmt.Errorf("only code cells can run")
	}

	executionCount, err := s.store.NextExecutionCount(ctx, cell.NotebookID, cell.ID)
	if err != nil {
		return nil, err
	}

	run := CellRun{
		ID:             "run_" + uuid.NewString(),
		NotebookID:     cell.NotebookID,
		CellID:         cell.ID,
		ConvID:         convIDForCell(cell.NotebookID, cell.ID),
		ExecutionCount: executionCount,
		Status:         "running",
		SourceHash:     sourceHash(cell.Source),
		StartedAtMs:    time.Now().UnixMilli(),
	}
	if err := s.store.CreateRun(ctx, run); err != nil {
		return nil, err
	}

	result, err := s.cozo.Query(cell.Source, nil)
	if err != nil {
		output := &CellOutput{
			Kind:    "error_result",
			Message: err.Error(),
			Display: err.Error(),
		}
		return s.finishRunWithOutput(ctx, run, "error", output)
	}

	if !result.OK {
		output := &CellOutput{
			Kind:    "error_result",
			Message: result.Message,
			Display: result.Display,
			Code:    result.Code,
		}
		return s.finishRunWithOutput(ctx, run, "error", output)
	}

	output := &CellOutput{
		Kind:    "query_result",
		Headers: result.Headers,
		Rows:    result.Rows,
		Took:    result.Took,
	}
	return s.finishRunWithOutput(ctx, run, "complete", output)
}

func (s *Service) finishRunWithOutput(ctx context.Context, run CellRun, status string, output *CellOutput) (*CellRuntimeState, error) {
	if err := s.store.FinishRun(ctx, run.ID, status); err != nil {
		return nil, err
	}

	finished := time.Now().UnixMilli()
	run.Status = status
	run.FinishedAtMs = &finished

	version, err := s.nextTimelineVersion(ctx, run.ConvID)
	if err != nil {
		return nil, err
	}
	entity, err := buildTimelineEntity(run, output, finished)
	if err != nil {
		return nil, err
	}
	if err := s.timeline.Upsert(ctx, run.ConvID, version, entity); err != nil {
		return nil, err
	}
	if err := s.timeline.UpsertConversation(ctx, chatstore.ConversationRecord{
		ConvID:          run.ConvID,
		SessionID:       s.sessionID,
		RuntimeKey:      s.runtimeKey,
		CreatedAtMs:     run.StartedAtMs,
		LastActivityMs:  finished,
		LastSeenVersion: version,
		HasTimeline:     true,
		Status:          status,
	}); err != nil {
		return nil, err
	}
	if err := s.store.RecordTimelineSnapshot(ctx, TimelineSnapshotLink{
		NotebookID:      run.NotebookID,
		CellID:          run.CellID,
		RunID:           run.ID,
		ConvID:          run.ConvID,
		SnapshotVersion: version,
		CreatedAtMs:     finished,
	}); err != nil {
		return nil, err
	}

	return &CellRuntimeState{
		Run:    &run,
		Output: output,
	}, nil
}

func (s *Service) hydrateNotebookRuntime(ctx context.Context, doc *NotebookDocument) (*NotebookDocument, error) {
	if doc == nil {
		return nil, fmt.Errorf("notebook document is nil")
	}
	latestRuns, err := s.store.ListLatestRunsByCell(ctx, doc.Notebook.ID)
	if err != nil {
		return nil, err
	}
	doc.Runtime = map[string]*CellRuntimeState{}
	for _, cell := range doc.Cells {
		run := latestRuns[cell.ID]
		if run == nil {
			continue
		}
		output, err := s.loadLatestOutput(ctx, run.ConvID)
		if err != nil {
			return nil, err
		}
		doc.Runtime[cell.ID] = &CellRuntimeState{
			Run:    run,
			Output: output,
		}
	}
	return doc, nil
}

func (s *Service) loadLatestOutput(ctx context.Context, convID string) (*CellOutput, error) {
	snapshot, err := s.timeline.GetSnapshot(ctx, convID, 0, 500)
	if err != nil {
		return nil, err
	}
	var latest *CellOutput
	var latestCount float64 = -1
	for _, entity := range snapshot.Entities {
		props := entity.GetProps()
		if props == nil {
			continue
		}
		kind := props.Fields["output_kind"].GetStringValue()
		if kind != "query_result" && kind != "error_result" {
			continue
		}

		executionCount := props.Fields["execution_count"].GetNumberValue()
		output := &CellOutput{Kind: kind}
		switch kind {
		case "query_result":
			output.Headers = stringListFromStructField(props, "headers")
			output.Rows = rowsFromStructField(props, "rows")
			output.Took = props.Fields["took"].GetNumberValue()
		case "error_result":
			output.Message = props.Fields["message"].GetStringValue()
			output.Display = props.Fields["display"].GetStringValue()
			output.Code = props.Fields["code"].GetStringValue()
		}

		if executionCount >= latestCount {
			latestCount = executionCount
			latest = output
		}
	}
	return latest, nil
}

func (s *Service) nextTimelineVersion(ctx context.Context, convID string) (uint64, error) {
	record, ok, err := s.timeline.GetConversation(ctx, convID)
	if err != nil {
		return 0, err
	}
	if !ok {
		return 1, nil
	}
	return record.LastSeenVersion + 1, nil
}

func convIDForCell(notebookID string, cellID string) string {
	return fmt.Sprintf("notebook:%s:cell:%s", notebookID, cellID)
}

func sourceHash(source string) string {
	sum := sha256.Sum256([]byte(source))
	return hex.EncodeToString(sum[:])
}

func buildTimelineEntity(run CellRun, output *CellOutput, now int64) (*timelinepb.TimelineEntityV2, error) {
	propsMap := map[string]any{
		"notebook_id":     run.NotebookID,
		"cell_id":         run.CellID,
		"run_id":          run.ID,
		"conv_id":         run.ConvID,
		"execution_count": float64(run.ExecutionCount),
		"status":          run.Status,
		"source_hash":     run.SourceHash,
		"output_kind":     output.Kind,
	}
	switch output.Kind {
	case "query_result":
		propsMap["headers"] = normalizeStructValue(output.Headers)
		propsMap["rows"] = normalizeStructValue(output.Rows)
		propsMap["took"] = output.Took
	case "error_result":
		propsMap["message"] = output.Message
		propsMap["display"] = output.Display
		propsMap["code"] = output.Code
	default:
		for key, value := range output.Data {
			propsMap[key] = value
		}
	}
	props, err := structpb.NewStruct(propsMap)
	if err != nil {
		return nil, err
	}
	return &timelinepb.TimelineEntityV2{
		Id:          fmt.Sprintf("%s:%s", output.Kind, run.ID),
		Kind:        output.Kind,
		CreatedAtMs: run.StartedAtMs,
		UpdatedAtMs: now,
		Props:       props,
		Meta: map[string]string{
			"notebook_id": run.NotebookID,
			"cell_id":     run.CellID,
			"run_id":      run.ID,
		},
	}, nil
}

func stringListFromStructField(props *structpb.Struct, key string) []string {
	field, ok := props.Fields[key]
	if !ok || field.GetListValue() == nil {
		return nil
	}
	out := make([]string, 0, len(field.GetListValue().Values))
	for _, value := range field.GetListValue().Values {
		out = append(out, value.GetStringValue())
	}
	return out
}

func rowsFromStructField(props *structpb.Struct, key string) [][]any {
	field, ok := props.Fields[key]
	if !ok || field.GetListValue() == nil {
		return nil
	}
	rows := make([][]any, 0, len(field.GetListValue().Values))
	for _, rowValue := range field.GetListValue().Values {
		if rowValue.GetListValue() == nil {
			continue
		}
		row := make([]any, 0, len(rowValue.GetListValue().Values))
		for _, cellValue := range rowValue.GetListValue().Values {
			switch kind := cellValue.Kind.(type) {
			case *structpb.Value_StringValue:
				row = append(row, kind.StringValue)
			case *structpb.Value_NumberValue:
				row = append(row, kind.NumberValue)
			case *structpb.Value_BoolValue:
				row = append(row, kind.BoolValue)
			case *structpb.Value_ListValue:
				row = append(row, cellValue.AsInterface())
			case *structpb.Value_StructValue:
				row = append(row, cellValue.AsInterface())
			default:
				row = append(row, cellValue.AsInterface())
			}
		}
		rows = append(rows, row)
	}
	return rows
}

func normalizeStructValue(value any) any {
	switch typed := value.(type) {
	case []string:
		out := make([]any, 0, len(typed))
		for _, item := range typed {
			out = append(out, item)
		}
		return out
	case [][]any:
		out := make([]any, 0, len(typed))
		for _, row := range typed {
			out = append(out, normalizeStructValue(row))
		}
		return out
	case []any:
		out := make([]any, 0, len(typed))
		for _, item := range typed {
			out = append(out, normalizeStructValue(item))
		}
		return out
	case map[string]any:
		out := map[string]any{}
		for key, item := range typed {
			out[key] = normalizeStructValue(item)
		}
		return out
	default:
		return value
	}
}

type AIRequestContext struct {
	NotebookID  string
	OwnerCellID string
	RunID       string
}

func (s *Service) NormalizeAIRequestContext(ctx AIRequestContext) AIRequestContext {
	ctx.NotebookID = strings.TrimSpace(ctx.NotebookID)
	ctx.OwnerCellID = strings.TrimSpace(ctx.OwnerCellID)
	ctx.RunID = strings.TrimSpace(ctx.RunID)
	return ctx
}
