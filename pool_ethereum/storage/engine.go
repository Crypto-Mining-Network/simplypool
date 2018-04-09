package storage

import (
	"math/big"
	"time"
	"net/http"
	"net/url"
	"fmt"
	"io/ioutil"
	"strings"
	"encoding/json"
)

type Config struct {
	Url string `json:"url"`
}

type EngineClient struct {
	url string
	coin string
	sigDivisor int64
}

type BlockData struct {
	Id             int64    `json:"id"`
	Height         int64    `json:"height"`
	Timestamp      int64    `json:"timestamp"`
	Difficulty     int64    `json:"difficulty"`
	TotalShares    int64    `json:"shares"`
	Uncle          bool     `json:"uncle"`
	UncleHeight    int64    `json:"uncleHeight"`
	Orphan         bool     `json:"orphan"`
	Hash           string   `json:"hash"`
	Nonce          string   `json:"-"`
	PowHash        string   `json:"-"`
	MixDigest      string   `json:"-"`
	Reward         *big.Int `json:"-"`
	ExtraReward    *big.Int `json:"-"`
	ImmatureReward string   `json:"-"`
	RewardString   string   `json:"reward"`
	RoundHeight    int64    `json:"-"`
	candidateKey   string
	immatureKey    string
}

func NewEngineClient(cfg *Config, coin string, sigDivisor int64) *EngineClient {
	return &EngineClient{url: cfg.Url, coin: coin, sigDivisor: sigDivisor}
}

func (r *EngineClient) WriteNodeState(id string, height uint64, diff *big.Int) error {
	//tx := r.client.Multi()
	//defer tx.Close()
	//
	//now := util.MakeTimestamp() / 1000
	//
	//_, err := tx.Exec(func() error {
	//	tx.HSet(r.formatKey("nodes"), join(id, "name"), id)
	//	tx.HSet(r.formatKey("nodes"), join(id, "height"), strconv.FormatUint(height, 10))
	//	tx.HSet(r.formatKey("nodes"), join(id, "difficulty"), diff.String())
	//	tx.HSet(r.formatKey("nodes"), join(id, "lastBeat"), strconv.FormatInt(now, 10))
	//	return nil
	//})
	//return err
	return nil
}


func (r *EngineClient) checkPoWExist(height uint64, params []string) (bool, error) {
	// Sweep PoW backlog for previous blocks, we have 3 templates back in RAM
	//r.client.ZRemRangeByScore(r.formatKey("pow"), "-inf", fmt.Sprint("(", height-8))
	//val, err := r.client.ZAdd(r.formatKey("pow"), redis.Z{Score: float64(height), Member: strings.Join(params, ":")}).Result()
	//return val == 0, err
	return false, nil
}

func (r *EngineClient) WriteShare(login, id string, params []string, diff int64, height uint64, window time.Duration) (bool, error) {
	exist, err := r.checkPoWExist(height, params)
	if err != nil {
		return false, err
	}
	// Duplicate share, (nonce, powHash, mixDigest) pair exist
	if exist {
		return true, nil
	}

	resp, err := http.PostForm(
		fmt.Sprintf("%s/submit_share", r.url),
		url.Values{"coin": {r.coin}, "wallet": {login}, "count": {fmt.Sprintf("%v", diff)}, "worker": {id}})
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()
	_, err = ioutil.ReadAll(resp.Body)
	if err != nil {
		return false, err
	}

	return false, nil
}

func (r *EngineClient) WriteBlock(login, id string, params []string, diff, roundDiff int64, height uint64, window time.Duration) (bool, error) {
	exist, err := r.WriteShare(login, id, params, diff, height, window)

	if err != nil {
		return false, err
	}
	// Duplicate share, (nonce, powHash, mixDigest) pair exist
	if exist {
		return true, nil
	}

	hashHex := strings.Join(params, ":")
	resp, err := http.PostForm(
		fmt.Sprintf("%s/submit_block", r.url),
		url.Values{"coin": {r.coin}, "height": {fmt.Sprintf("%v", height)}, "hash": {hashHex}})
	if err != nil {
		return false, err
	}
	defer resp.Body.Close()
	_, err = ioutil.ReadAll(resp.Body)
	if err != nil {
		return false, err
	}

	return false, nil
}

func (r *EngineClient) GetCandidates(maxHeight int64) ([]*BlockData, error) {
	resp, err := http.Get(fmt.Sprintf("%s/blocks_to_validate?coin=%s", r.url, r.coin))
	if err != nil {
		return nil, err
	}
	var blocks []struct {
		Id int64 `json:"id"`
		Height  int64 `json:"height"`
		Hash string `json:"hash"`
	}
	json.NewDecoder(resp.Body).Decode(&blocks)

	var result []*BlockData
	for _, v := range blocks {
		if (v.Height < maxHeight) {
			block := BlockData{}
			block.Id = v.Id
			block.Height = v.Height
			fields := strings.Split(v.Hash, ":")
			block.Nonce = fields[0]
			block.PowHash = fields[1]
			block.MixDigest = fields[2]
			result = append(result, &block)
		}
	}

	return result, nil
}

func (r *EngineClient) ValidateBlock(block *BlockData, isValid bool) (error) {
	isValidStr := "0"
	if (isValid) {
		isValidStr = "1"
	}

	_, err := http.PostForm(
		fmt.Sprintf("%s/validate_block", r.url),
		url.Values{"block_id": {fmt.Sprintf("%v", block.Id)}, "is_valid": {isValidStr}, "reward": {fmt.Sprintf("%v", new(big.Float).Quo(new(big.Float).SetInt(block.Reward), new(big.Float).SetInt(big.NewInt(r.sigDivisor))))}, "height": {fmt.Sprintf("%v", block.Height)}})

	return err
}