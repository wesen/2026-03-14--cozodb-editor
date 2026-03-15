package hints

import (
	"sync"

	"github.com/go-go-golems/geppetto/pkg/events"
)

type streamingTextSink struct {
	onDelta DeltaCallback

	mu         sync.Mutex
	sawPartial bool
	finalText  string
	meta       events.EventMetadata
}

func newStreamingTextSink(onDelta DeltaCallback) *streamingTextSink {
	return &streamingTextSink{onDelta: onDelta}
}

func (s *streamingTextSink) PublishEvent(event events.Event) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	switch ev := event.(type) {
	case *events.EventPartialCompletion:
		if ev.Delta == "" {
			return nil
		}
		s.meta = ev.Metadata()
		s.sawPartial = true
		if s.onDelta != nil {
			s.onDelta(ev.Delta)
		}
	case *events.EventFinal:
		s.finalText = ev.Text
		s.meta = ev.Metadata()
		if !s.sawPartial && ev.Text != "" && s.onDelta != nil {
			s.onDelta(ev.Text)
		}
	}

	return nil
}

func (s *streamingTextSink) FinalText() string {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.finalText
}

func (s *streamingTextSink) Metadata() events.EventMetadata {
	s.mu.Lock()
	defer s.mu.Unlock()
	return s.meta
}
