// +build go1.9

package main

import (
	"encoding/json"
	"log"
	"math/rand"
	"os"
	"path/filepath"
	"runtime"
	"time"

	"github.com/sammy007/open-ethereum-pool/proxy"
	"github.com/sammy007/open-ethereum-pool/storage"
	"github.com/sammy007/open-ethereum-pool/validator"
)

var cfg proxy.Config
var backend *storage.EngineClient

func startProxy() {
	s := proxy.NewProxy(&cfg, backend)
	s.Start()
}

func startBlockValidator() {
	u := validator.NewBlockValidator(&cfg.BlockValidator, backend)
	u.Start()
}

func readConfig(cfg *proxy.Config) {
	configFileName := "config.json"
	if len(os.Args) > 1 {
		configFileName = os.Args[1]
	}
	configFileName, _ = filepath.Abs(configFileName)
	log.Printf("Loading config: %v", configFileName)

	configFile, err := os.Open(configFileName)
	if err != nil {
		log.Fatal("File error: ", err.Error())
	}
	defer configFile.Close()
	jsonParser := json.NewDecoder(configFile)
	if err := jsonParser.Decode(&cfg); err != nil {
		log.Fatal("Config error: ", err.Error())
	}
}

func main() {
	readConfig(&cfg)
	rand.Seed(time.Now().UnixNano())

	if cfg.Threads > 0 {
		runtime.GOMAXPROCS(cfg.Threads)
		log.Printf("Running with %v threads", cfg.Threads)
	}

	backend = storage.NewEngineClient(&cfg.Engine, cfg.Coin, cfg.SigDivisor)

	go startProxy()
	go startBlockValidator()
	quit := make(chan bool)
	<-quit
}
