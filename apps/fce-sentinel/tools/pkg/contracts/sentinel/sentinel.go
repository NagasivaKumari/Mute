//go:generate go run github.com/ethereum/go-ethereum/cmd/abigen --abi=SentinelInstructionSender.abi --bin=SentinelInstructionSender.bin --pkg=sentinel --type=SentinelInstructionSender --out=autogen.go

package sentinel
