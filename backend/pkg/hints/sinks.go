package hints

import gepevents "github.com/go-go-golems/geppetto/pkg/events"

type fanoutSink struct {
	sinks []gepevents.EventSink
}

func (s *fanoutSink) PublishEvent(event gepevents.Event) error {
	for _, sink := range s.sinks {
		if sink == nil {
			continue
		}
		if err := sink.PublishEvent(event); err != nil {
			return err
		}
	}
	return nil
}
