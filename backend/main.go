package main

import (
	"flag"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"

	"github.com/wesen/cozodb-editor/backend/pkg/api"
	"github.com/wesen/cozodb-editor/backend/pkg/cozo"
	"github.com/wesen/cozodb-editor/backend/pkg/hints"
	"github.com/wesen/cozodb-editor/backend/pkg/notebook"
)

func main() {
	addr := flag.String("addr", ":8080", "HTTP listen address")
	engine := flag.String("engine", "mem", "CozoDB engine (mem, sqlite)")
	dbPath := flag.String("db-path", "", "CozoDB database path (for sqlite engine)")
	appDBPath := flag.String("app-db-path", "./data/cozodb-editor-app.sqlite", "Application SQLite database path for notebooks and timeline state")
	viteURL := flag.String("vite", "http://localhost:5173", "Vite dev server URL (empty to disable proxy)")
	flag.Parse()

	// Open CozoDB
	log.Printf("[MAIN] Opening CozoDB (engine=%s, path=%s)", *engine, *dbPath)
	db, err := cozo.NewDB(*engine, *dbPath)
	if err != nil {
		log.Fatalf("Failed to open CozoDB: %v", err)
	}
	defer db.Close()

	// Test the database
	result, err := db.Query("?[] <- [[1, 'hello']]", nil)
	if err != nil {
		log.Fatalf("CozoDB test query failed: %v", err)
	}
	log.Printf("[MAIN] CozoDB ready: %v", result.OK)

	// Initialize AI hint engine (optional)
	var hintEngine *hints.Engine
	if os.Getenv("ANTHROPIC_API_KEY") != "" {
		hintEngine, err = hints.NewEngine()
		if err != nil {
			log.Printf("[MAIN] AI hints disabled: %v", err)
		} else {
			log.Printf("[MAIN] AI hints enabled (Anthropic)")
		}
	} else {
		log.Printf("[MAIN] AI hints disabled (no ANTHROPIC_API_KEY)")
	}

	// Set up HTTP handlers
	notebookSvc, err := notebook.OpenService(*appDBPath, db)
	if err != nil {
		log.Fatalf("Failed to open notebook service: %v", err)
	}
	defer func() {
		if err := notebookSvc.Close(); err != nil {
			log.Printf("[MAIN] notebook service close error: %v", err)
		}
	}()

	srv := &api.Server{DB: db, Notebook: notebookSvc}
	wsHandler := &api.WSHandler{DB: db, Engine: hintEngine}

	mux := http.NewServeMux()

	// API routes
	mux.HandleFunc("/api/query", srv.HandleQuery)
	mux.HandleFunc("/api/schema", func(w http.ResponseWriter, r *http.Request) {
		// Route to detail handler if path has a name after /api/schema/
		if r.URL.Path != "/api/schema" && r.URL.Path != "/api/schema/" {
			srv.HandleSchemaDetail(w, r)
			return
		}
		srv.HandleSchema(w, r)
	})
	mux.HandleFunc("/api/schema/", srv.HandleSchemaDetail)
	mux.HandleFunc("/api/notebooks", srv.HandleCreateNotebook)
	mux.HandleFunc("/api/notebooks/bootstrap", srv.HandleBootstrapNotebook)
	mux.HandleFunc("/api/notebooks/", srv.HandleNotebook)
	mux.HandleFunc("/api/notebook-cells/", srv.HandleNotebookCell)

	// WebSocket
	mux.HandleFunc("/ws/hints", wsHandler.HandleWS)

	// Proxy to Vite dev server for frontend
	if *viteURL != "" {
		viteTarget, err := url.Parse(*viteURL)
		if err != nil {
			log.Fatalf("Invalid vite URL: %v", err)
		}
		proxy := httputil.NewSingleHostReverseProxy(viteTarget)
		mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
			proxy.ServeHTTP(w, r)
		})
		log.Printf("[MAIN] Proxying / to %s", *viteURL)
	}

	// CORS middleware
	handler := corsMiddleware(mux)

	log.Printf("[MAIN] Listening on %s", *addr)
	if err := http.ListenAndServe(*addr, handler); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

func corsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}

		next.ServeHTTP(w, r)
	})
}
