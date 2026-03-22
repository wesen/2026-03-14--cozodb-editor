package notebook

import (
	"context"

	chatstore "github.com/go-go-golems/pinocchio/pkg/persistence/chatstore"
	timelinepb "github.com/go-go-golems/pinocchio/pkg/sem/pb/proto/sem/timeline"
)

type TimelineConversationRecord = chatstore.ConversationRecord

type TimelineStore interface {
	Close() error
	GetConversation(ctx context.Context, convID string) (TimelineConversationRecord, bool, error)
	GetSnapshot(ctx context.Context, convID string, sinceVersion uint64, limit int) (*timelinepb.TimelineSnapshotV2, error)
	ListConversations(ctx context.Context, limit int, sinceMs int64) ([]TimelineConversationRecord, error)
	Upsert(ctx context.Context, convID string, version uint64, entity *timelinepb.TimelineEntityV2) error
	UpsertConversation(ctx context.Context, record TimelineConversationRecord) error
}

func OpenSQLiteTimelineStore(appDBPath string) (TimelineStore, error) {
	dsn, err := chatstore.SQLiteTimelineDSNForFile(appDBPath)
	if err != nil {
		return nil, err
	}
	return chatstore.NewSQLiteTimelineStore(dsn)
}
