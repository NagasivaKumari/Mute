// Code generated - DO NOT EDIT.
// This file is a generated binding and any manual changes will be lost.

package sentinel

import (
	"errors"
	"math/big"
	"strings"

	ethereum "github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/accounts/abi/bind"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/event"
)

// Reference imports to suppress errors if they are not otherwise used.
var (
	_ = errors.New
	_ = big.NewInt
	_ = strings.NewReader
	_ = ethereum.NotFound
	_ = bind.Bind
	_ = common.Big1
	_ = types.BloomLookup
	_ = event.NewSubscription
	_ = abi.ConvertType
)

// SentinelInstructionSenderMetaData contains all meta data concerning the SentinelInstructionSender contract.
var SentinelInstructionSenderMetaData = &bind.MetaData{
	ABI: "[{\"type\":\"constructor\",\"inputs\":[{\"name\":\"_teeExtensionRegistry\",\"type\":\"address\",\"internalType\":\"address\"},{\"name\":\"_teeMachineRegistry\",\"type\":\"address\",\"internalType\":\"address\"}],\"stateMutability\":\"nonpayable\"},{\"type\":\"function\",\"name\":\"OP_COMMAND_ATTEST_POLICY\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"OP_COMMAND_AUTHORIZE_DANGEROUS\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"OP_COMMAND_AUTHORIZE_SECRET\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"OP_COMMAND_GET_STATE\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"OP_TYPE_SENTINEL\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"bytes32\",\"internalType\":\"bytes32\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"TEE_EXTENSION_REGISTRY\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"contractITeeExtensionRegistry\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"TEE_MACHINE_REGISTRY\",\"inputs\":[],\"outputs\":[{\"name\":\"\",\"type\":\"address\",\"internalType\":\"contractITeeMachineRegistry\"}],\"stateMutability\":\"view\"},{\"type\":\"function\",\"name\":\"attestPolicy\",\"inputs\":[{\"name\":\"_data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"authorizeDangerous\",\"inputs\":[{\"name\":\"_data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"authorizeSecret\",\"inputs\":[{\"name\":\"_data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"getState\",\"inputs\":[{\"name\":\"_data\",\"type\":\"bytes\",\"internalType\":\"bytes\"}],\"outputs\":[],\"stateMutability\":\"payable\"},{\"type\":\"function\",\"name\":\"setExtensionId\",\"inputs\":[],\"outputs\":[],\"stateMutability\":\"nonpayable\"},{\"type\":\"event\",\"name\":\"InstructionDispatched\",\"inputs\":[{\"name\":\"instructionId\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"opType\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"},{\"name\":\"opCommand\",\"type\":\"bytes32\",\"indexed\":true,\"internalType\":\"bytes32\"}],\"anonymous\":false}]",
	Bin: "0x60c03461021e57601f610f8c38819003918201601f19168301916001600160401b0383118484101761022257808492604094855283398101031261021e57610052602061004b83610236565b9201610236565b6001600160a01b0382169081156101c5576001600160a01b03811692831561016e573b1561012a573b156100e55760805260a052604051610d41908161024b823960805181818161019e01528181610333015281816104b7015281816106860152818161081e015261093c015260a05181818160d6015281816102a00152818161041a0152818161058701526105ec0152f35b60405162461bcd60e51b815260206004820152601e60248201527f5465654d616368696e65526567697374727920686173206e6f20636f646500006044820152606490fd5b606460405162461bcd60e51b815260206004820152602060248201527f546565457874656e73696f6e526567697374727920686173206e6f20636f64656044820152fd5b60405162461bcd60e51b815260206004820152602960248201527f5465654d616368696e6552656769737472792063616e6e6f74206265207a65726044820152686f206164647265737360b81b6064820152608490fd5b60405162461bcd60e51b815260206004820152602b60248201527f546565457874656e73696f6e52656769737472792063616e6e6f74206265207a60448201526a65726f206164647265737360a81b6064820152608490fd5b5f80fd5b634e487b7160e01b5f52604160045260245ffd5b51906001600160a01b038216820361021e5756fe6080806040526004361015610012575f80fd5b5f3560e01c908163184c25881461084d57508063347595131461080957806372a04a55146107db578063a52f40cf146107b0578063a8f15ff114610789578063aa5032c61461076f578063afcc3e001461073e578063baf3ff3c146105b6578063d77798a914610572578063e2907b76146103e4578063e35f157c1461026a5763ef4b73f6146100a0575f80fd5b6100a936610870565b906100b2610c9b565b60405163feeabcbf60e01b8152600481019190915260016024820152905f826044817f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03165afa918215610239575f92610244575b50610199919260209384926101686040519161012a86846108f1565b5f83525f3681376040519461013e866108c1565b6714d153951253915360c21b86526c4154544553545f504f4c49435960981b878701523691610b56565b604084015260608301525f60808301523360a0830152604051938492839263f731df5360e01b845260048401610b9c565b0381347f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03165af1918215610239575f92610207575b6c4154544553545f504f4c49435960981b6714d153951253915360c21b845f516020610cec5f395f51905f525f80a4005b90809250813d8311610232575b61021e81836108f1565b8101031261022e57515f806101d6565b5f80fd5b503d610214565b6040513d5f823e3d90fd5b6101999250610264903d805f833e61025c81836108f1565b810190610ac8565b9161010e565b61027336610870565b9061027c610c9b565b60405163feeabcbf60e01b8152600481019190915260016024820152905f826044817f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03165afa918215610239575f926103c6575b5061032e91926020938492610168604051916102f486846108f1565b5f83525f36813760405194610308866108c1565b6714d153951253915360c21b8652684745545f535441544560b81b878701523691610b56565b0381347f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03165af1918215610239575f92610398575b684745545f535441544560b81b6714d153951253915360c21b845f516020610cec5f395f51905f525f80a4005b90809250813d83116103bf575b6103af81836108f1565b8101031261022e5751818061036b565b503d6103a5565b61032e92506103de903d805f833e61025c81836108f1565b916102d8565b6103ed36610870565b906103f6610c9b565b60405163feeabcbf60e01b8152600481019190915260016024820152905f826044817f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03165afa918215610239575f92610554575b506104b2919260209384926101686040519161046e86846108f1565b5f83525f36813760405194610482866108c1565b6714d153951253915360c21b865272415554484f52495a455f44414e4745524f555360681b878701523691610b56565b0381347f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03165af1918215610239575f92610526575b72415554484f52495a455f44414e4745524f555360681b6714d153951253915360c21b845f516020610cec5f395f51905f525f80a4005b90809250813d831161054d575b61053d81836108f1565b8101031261022e575181806104ef565b503d610533565b6104b2925061056c903d805f833e61025c81836108f1565b91610452565b3461022e575f36600319011261022e576040517f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03168152602090f35b6105bf36610870565b906105c8610c9b565b60405163feeabcbf60e01b8152600481019190915260016024820152905f826044817f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03165afa918215610239575f92610720575b50610681919260209384926101686040519161064086846108f1565b5f83525f36813760405194610654866108c1565b6714d153951253915360c21b86526f1055551213d492569157d4d150d4915560821b878701523691610b56565b0381347f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03165af1918215610239575f926106f2575b6f1055551213d492569157d4d150d4915560821b6714d153951253915360c21b845f516020610cec5f395f51905f525f80a4005b90809250813d8311610719575b61070981836108f1565b8101031261022e575181806106be565b503d6106ff565b6106819250610738903d805f833e61025c81836108f1565b91610624565b3461022e575f36600319011261022e5760405172415554484f52495a455f44414e4745524f555360681b8152602090f35b3461022e575f36600319011261022e57610787610927565b005b3461022e575f36600319011261022e57604051684745545f535441544560b81b8152602090f35b3461022e575f36600319011261022e576040516c4154544553545f504f4c49435960981b8152602090f35b3461022e575f36600319011261022e576040516f1055551213d492569157d4d150d4915560821b8152602090f35b3461022e575f36600319011261022e576040517f00000000000000000000000000000000000000000000000000000000000000006001600160a01b03168152602090f35b3461022e575f36600319011261022e576714d153951253915360c21b8152602090f35b90602060031983011261022e5760043567ffffffffffffffff811161022e578260238201121561022e5780600401359267ffffffffffffffff841161022e576024848301011161022e576024019190565b60c0810190811067ffffffffffffffff8211176108dd57604052565b634e487b7160e01b5f52604160045260245ffd5b90601f8019910116810190811067ffffffffffffffff8211176108dd57604052565b51906001600160a01b038216820361022e57565b5f54610a83576040516327582ad560e01b81527f00000000000000000000000000000000000000000000000000000000000000006001600160a01b0316602082600481845afa918215610239575f92610a4f575b50620100005b8281106109cd5760405162461bcd60e51b815260206004820152601760248201527f457874656e73696f6e204944206e6f7420666f756e642e0000000000000000006044820152606490fd5b604051630582ee6b60e31b815260048101829052602081602481865afa908115610239575f91610a16575b506001600160a01b03163014610a1057600101610981565b5f555050565b90506020813d8211610a47575b81610a30602093836108f1565b8101031261022e57610a4190610913565b5f6109f8565b3d9150610a23565b9091506020813d602011610a7b575b81610a6b602093836108f1565b8101031261022e5751905f61097b565b3d9150610a5e565b60405162461bcd60e51b815260206004820152601960248201527f457874656e73696f6e20494420616c7265616479207365742e000000000000006044820152606490fd5b60208183031261022e5780519067ffffffffffffffff821161022e57019080601f8301121561022e5781519167ffffffffffffffff83116108dd578260051b906020820193610b1a60405195866108f1565b845260208085019282010192831161022e57602001905b828210610b3e5750505090565b60208091610b4b84610913565b815201910190610b31565b92919267ffffffffffffffff82116108dd5760405191610b80601f8201601f1916602001846108f1565b82948184528183011161022e578281602093845f960137010152565b604081016040825282518091526020606083019301905f5b818110610c7c57505050602081830391015281518152602082015160208201526020604083015160c0604084015280519182918260c08601520160e084015e5f60e08284010152601f801991011681019160e08301602061010060608401519560e08682030160608701528651809452019401905f5b818110610c5d5750505060808082015167ffffffffffffffff169083015260a0908101516001600160a01b031691015290565b82516001600160a01b0316865260209586019590920191600101610c2a565b82516001600160a01b0316855260209485019490920191600101610bb4565b5f548015610ca65790565b60405162461bcd60e51b815260206004820152601860248201527f457874656e73696f6e204944206973206e6f74207365742e00000000000000006044820152606490fdfecee23ef6737564df1443394629b74035062c457c95a0297b78639454eba43875a26469706673582212208a4d805657a5113a6bd2e0c7bf61ecd6fc382b1150f95a6b007b21be15c12bd464736f6c634300081c0033",
}

// SentinelInstructionSenderABI is the input ABI used to generate the binding from.
// Deprecated: Use SentinelInstructionSenderMetaData.ABI instead.
var SentinelInstructionSenderABI = SentinelInstructionSenderMetaData.ABI

// SentinelInstructionSenderBin is the compiled bytecode used for deploying new contracts.
// Deprecated: Use SentinelInstructionSenderMetaData.Bin instead.
var SentinelInstructionSenderBin = SentinelInstructionSenderMetaData.Bin

// DeploySentinelInstructionSender deploys a new Ethereum contract, binding an instance of SentinelInstructionSender to it.
func DeploySentinelInstructionSender(auth *bind.TransactOpts, backend bind.ContractBackend, _teeExtensionRegistry common.Address, _teeMachineRegistry common.Address) (common.Address, *types.Transaction, *SentinelInstructionSender, error) {
	parsed, err := SentinelInstructionSenderMetaData.GetAbi()
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	if parsed == nil {
		return common.Address{}, nil, nil, errors.New("GetABI returned nil")
	}

	address, tx, contract, err := bind.DeployContract(auth, *parsed, common.FromHex(SentinelInstructionSenderBin), backend, _teeExtensionRegistry, _teeMachineRegistry)
	if err != nil {
		return common.Address{}, nil, nil, err
	}
	return address, tx, &SentinelInstructionSender{SentinelInstructionSenderCaller: SentinelInstructionSenderCaller{contract: contract}, SentinelInstructionSenderTransactor: SentinelInstructionSenderTransactor{contract: contract}, SentinelInstructionSenderFilterer: SentinelInstructionSenderFilterer{contract: contract}}, nil
}

// SentinelInstructionSender is an auto generated Go binding around an Ethereum contract.
type SentinelInstructionSender struct {
	SentinelInstructionSenderCaller     // Read-only binding to the contract
	SentinelInstructionSenderTransactor // Write-only binding to the contract
	SentinelInstructionSenderFilterer   // Log filterer for contract events
}

// SentinelInstructionSenderCaller is an auto generated read-only Go binding around an Ethereum contract.
type SentinelInstructionSenderCaller struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// SentinelInstructionSenderTransactor is an auto generated write-only Go binding around an Ethereum contract.
type SentinelInstructionSenderTransactor struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// SentinelInstructionSenderFilterer is an auto generated log filtering Go binding around an Ethereum contract events.
type SentinelInstructionSenderFilterer struct {
	contract *bind.BoundContract // Generic contract wrapper for the low level calls
}

// SentinelInstructionSenderSession is an auto generated Go binding around an Ethereum contract,
// with pre-set call and transact options.
type SentinelInstructionSenderSession struct {
	Contract     *SentinelInstructionSender // Generic contract binding to set the session for
	CallOpts     bind.CallOpts              // Call options to use throughout this session
	TransactOpts bind.TransactOpts          // Transaction auth options to use throughout this session
}

// SentinelInstructionSenderCallerSession is an auto generated read-only Go binding around an Ethereum contract,
// with pre-set call options.
type SentinelInstructionSenderCallerSession struct {
	Contract *SentinelInstructionSenderCaller // Generic contract caller binding to set the session for
	CallOpts bind.CallOpts                    // Call options to use throughout this session
}

// SentinelInstructionSenderTransactorSession is an auto generated write-only Go binding around an Ethereum contract,
// with pre-set transact options.
type SentinelInstructionSenderTransactorSession struct {
	Contract     *SentinelInstructionSenderTransactor // Generic contract transactor binding to set the session for
	TransactOpts bind.TransactOpts                    // Transaction auth options to use throughout this session
}

// SentinelInstructionSenderRaw is an auto generated low-level Go binding around an Ethereum contract.
type SentinelInstructionSenderRaw struct {
	Contract *SentinelInstructionSender // Generic contract binding to access the raw methods on
}

// SentinelInstructionSenderCallerRaw is an auto generated low-level read-only Go binding around an Ethereum contract.
type SentinelInstructionSenderCallerRaw struct {
	Contract *SentinelInstructionSenderCaller // Generic read-only contract binding to access the raw methods on
}

// SentinelInstructionSenderTransactorRaw is an auto generated low-level write-only Go binding around an Ethereum contract.
type SentinelInstructionSenderTransactorRaw struct {
	Contract *SentinelInstructionSenderTransactor // Generic write-only contract binding to access the raw methods on
}

// NewSentinelInstructionSender creates a new instance of SentinelInstructionSender, bound to a specific deployed contract.
func NewSentinelInstructionSender(address common.Address, backend bind.ContractBackend) (*SentinelInstructionSender, error) {
	contract, err := bindSentinelInstructionSender(address, backend, backend, backend)
	if err != nil {
		return nil, err
	}
	return &SentinelInstructionSender{SentinelInstructionSenderCaller: SentinelInstructionSenderCaller{contract: contract}, SentinelInstructionSenderTransactor: SentinelInstructionSenderTransactor{contract: contract}, SentinelInstructionSenderFilterer: SentinelInstructionSenderFilterer{contract: contract}}, nil
}

// NewSentinelInstructionSenderCaller creates a new read-only instance of SentinelInstructionSender, bound to a specific deployed contract.
func NewSentinelInstructionSenderCaller(address common.Address, caller bind.ContractCaller) (*SentinelInstructionSenderCaller, error) {
	contract, err := bindSentinelInstructionSender(address, caller, nil, nil)
	if err != nil {
		return nil, err
	}
	return &SentinelInstructionSenderCaller{contract: contract}, nil
}

// NewSentinelInstructionSenderTransactor creates a new write-only instance of SentinelInstructionSender, bound to a specific deployed contract.
func NewSentinelInstructionSenderTransactor(address common.Address, transactor bind.ContractTransactor) (*SentinelInstructionSenderTransactor, error) {
	contract, err := bindSentinelInstructionSender(address, nil, transactor, nil)
	if err != nil {
		return nil, err
	}
	return &SentinelInstructionSenderTransactor{contract: contract}, nil
}

// NewSentinelInstructionSenderFilterer creates a new log filterer instance of SentinelInstructionSender, bound to a specific deployed contract.
func NewSentinelInstructionSenderFilterer(address common.Address, filterer bind.ContractFilterer) (*SentinelInstructionSenderFilterer, error) {
	contract, err := bindSentinelInstructionSender(address, nil, nil, filterer)
	if err != nil {
		return nil, err
	}
	return &SentinelInstructionSenderFilterer{contract: contract}, nil
}

// bindSentinelInstructionSender binds a generic wrapper to an already deployed contract.
func bindSentinelInstructionSender(address common.Address, caller bind.ContractCaller, transactor bind.ContractTransactor, filterer bind.ContractFilterer) (*bind.BoundContract, error) {
	parsed, err := SentinelInstructionSenderMetaData.GetAbi()
	if err != nil {
		return nil, err
	}
	return bind.NewBoundContract(address, *parsed, caller, transactor, filterer), nil
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_SentinelInstructionSender *SentinelInstructionSenderRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _SentinelInstructionSender.Contract.SentinelInstructionSenderCaller.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_SentinelInstructionSender *SentinelInstructionSenderRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _SentinelInstructionSender.Contract.SentinelInstructionSenderTransactor.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_SentinelInstructionSender *SentinelInstructionSenderRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _SentinelInstructionSender.Contract.SentinelInstructionSenderTransactor.contract.Transact(opts, method, params...)
}

// Call invokes the (constant) contract method with params as input values and
// sets the output to result. The result type might be a single field for simple
// returns, a slice of interfaces for anonymous returns and a struct for named
// returns.
func (_SentinelInstructionSender *SentinelInstructionSenderCallerRaw) Call(opts *bind.CallOpts, result *[]interface{}, method string, params ...interface{}) error {
	return _SentinelInstructionSender.Contract.contract.Call(opts, result, method, params...)
}

// Transfer initiates a plain transaction to move funds to the contract, calling
// its default method if one is available.
func (_SentinelInstructionSender *SentinelInstructionSenderTransactorRaw) Transfer(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _SentinelInstructionSender.Contract.contract.Transfer(opts)
}

// Transact invokes the (paid) contract method with params as input values.
func (_SentinelInstructionSender *SentinelInstructionSenderTransactorRaw) Transact(opts *bind.TransactOpts, method string, params ...interface{}) (*types.Transaction, error) {
	return _SentinelInstructionSender.Contract.contract.Transact(opts, method, params...)
}

// OPCOMMANDATTESTPOLICY is a free data retrieval call binding the contract method 0xa52f40cf.
//
// Solidity: function OP_COMMAND_ATTEST_POLICY() view returns(bytes32)
func (_SentinelInstructionSender *SentinelInstructionSenderCaller) OPCOMMANDATTESTPOLICY(opts *bind.CallOpts) ([32]byte, error) {
	var out []interface{}
	err := _SentinelInstructionSender.contract.Call(opts, &out, "OP_COMMAND_ATTEST_POLICY")

	if err != nil {
		return *new([32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([32]byte)).(*[32]byte)

	return out0, err

}

// OPCOMMANDATTESTPOLICY is a free data retrieval call binding the contract method 0xa52f40cf.
//
// Solidity: function OP_COMMAND_ATTEST_POLICY() view returns(bytes32)
func (_SentinelInstructionSender *SentinelInstructionSenderSession) OPCOMMANDATTESTPOLICY() ([32]byte, error) {
	return _SentinelInstructionSender.Contract.OPCOMMANDATTESTPOLICY(&_SentinelInstructionSender.CallOpts)
}

// OPCOMMANDATTESTPOLICY is a free data retrieval call binding the contract method 0xa52f40cf.
//
// Solidity: function OP_COMMAND_ATTEST_POLICY() view returns(bytes32)
func (_SentinelInstructionSender *SentinelInstructionSenderCallerSession) OPCOMMANDATTESTPOLICY() ([32]byte, error) {
	return _SentinelInstructionSender.Contract.OPCOMMANDATTESTPOLICY(&_SentinelInstructionSender.CallOpts)
}

// OPCOMMANDAUTHORIZEDANGEROUS is a free data retrieval call binding the contract method 0xafcc3e00.
//
// Solidity: function OP_COMMAND_AUTHORIZE_DANGEROUS() view returns(bytes32)
func (_SentinelInstructionSender *SentinelInstructionSenderCaller) OPCOMMANDAUTHORIZEDANGEROUS(opts *bind.CallOpts) ([32]byte, error) {
	var out []interface{}
	err := _SentinelInstructionSender.contract.Call(opts, &out, "OP_COMMAND_AUTHORIZE_DANGEROUS")

	if err != nil {
		return *new([32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([32]byte)).(*[32]byte)

	return out0, err

}

// OPCOMMANDAUTHORIZEDANGEROUS is a free data retrieval call binding the contract method 0xafcc3e00.
//
// Solidity: function OP_COMMAND_AUTHORIZE_DANGEROUS() view returns(bytes32)
func (_SentinelInstructionSender *SentinelInstructionSenderSession) OPCOMMANDAUTHORIZEDANGEROUS() ([32]byte, error) {
	return _SentinelInstructionSender.Contract.OPCOMMANDAUTHORIZEDANGEROUS(&_SentinelInstructionSender.CallOpts)
}

// OPCOMMANDAUTHORIZEDANGEROUS is a free data retrieval call binding the contract method 0xafcc3e00.
//
// Solidity: function OP_COMMAND_AUTHORIZE_DANGEROUS() view returns(bytes32)
func (_SentinelInstructionSender *SentinelInstructionSenderCallerSession) OPCOMMANDAUTHORIZEDANGEROUS() ([32]byte, error) {
	return _SentinelInstructionSender.Contract.OPCOMMANDAUTHORIZEDANGEROUS(&_SentinelInstructionSender.CallOpts)
}

// OPCOMMANDAUTHORIZESECRET is a free data retrieval call binding the contract method 0x72a04a55.
//
// Solidity: function OP_COMMAND_AUTHORIZE_SECRET() view returns(bytes32)
func (_SentinelInstructionSender *SentinelInstructionSenderCaller) OPCOMMANDAUTHORIZESECRET(opts *bind.CallOpts) ([32]byte, error) {
	var out []interface{}
	err := _SentinelInstructionSender.contract.Call(opts, &out, "OP_COMMAND_AUTHORIZE_SECRET")

	if err != nil {
		return *new([32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([32]byte)).(*[32]byte)

	return out0, err

}

// OPCOMMANDAUTHORIZESECRET is a free data retrieval call binding the contract method 0x72a04a55.
//
// Solidity: function OP_COMMAND_AUTHORIZE_SECRET() view returns(bytes32)
func (_SentinelInstructionSender *SentinelInstructionSenderSession) OPCOMMANDAUTHORIZESECRET() ([32]byte, error) {
	return _SentinelInstructionSender.Contract.OPCOMMANDAUTHORIZESECRET(&_SentinelInstructionSender.CallOpts)
}

// OPCOMMANDAUTHORIZESECRET is a free data retrieval call binding the contract method 0x72a04a55.
//
// Solidity: function OP_COMMAND_AUTHORIZE_SECRET() view returns(bytes32)
func (_SentinelInstructionSender *SentinelInstructionSenderCallerSession) OPCOMMANDAUTHORIZESECRET() ([32]byte, error) {
	return _SentinelInstructionSender.Contract.OPCOMMANDAUTHORIZESECRET(&_SentinelInstructionSender.CallOpts)
}

// OPCOMMANDGETSTATE is a free data retrieval call binding the contract method 0xa8f15ff1.
//
// Solidity: function OP_COMMAND_GET_STATE() view returns(bytes32)
func (_SentinelInstructionSender *SentinelInstructionSenderCaller) OPCOMMANDGETSTATE(opts *bind.CallOpts) ([32]byte, error) {
	var out []interface{}
	err := _SentinelInstructionSender.contract.Call(opts, &out, "OP_COMMAND_GET_STATE")

	if err != nil {
		return *new([32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([32]byte)).(*[32]byte)

	return out0, err

}

// OPCOMMANDGETSTATE is a free data retrieval call binding the contract method 0xa8f15ff1.
//
// Solidity: function OP_COMMAND_GET_STATE() view returns(bytes32)
func (_SentinelInstructionSender *SentinelInstructionSenderSession) OPCOMMANDGETSTATE() ([32]byte, error) {
	return _SentinelInstructionSender.Contract.OPCOMMANDGETSTATE(&_SentinelInstructionSender.CallOpts)
}

// OPCOMMANDGETSTATE is a free data retrieval call binding the contract method 0xa8f15ff1.
//
// Solidity: function OP_COMMAND_GET_STATE() view returns(bytes32)
func (_SentinelInstructionSender *SentinelInstructionSenderCallerSession) OPCOMMANDGETSTATE() ([32]byte, error) {
	return _SentinelInstructionSender.Contract.OPCOMMANDGETSTATE(&_SentinelInstructionSender.CallOpts)
}

// OPTYPESENTINEL is a free data retrieval call binding the contract method 0x184c2588.
//
// Solidity: function OP_TYPE_SENTINEL() view returns(bytes32)
func (_SentinelInstructionSender *SentinelInstructionSenderCaller) OPTYPESENTINEL(opts *bind.CallOpts) ([32]byte, error) {
	var out []interface{}
	err := _SentinelInstructionSender.contract.Call(opts, &out, "OP_TYPE_SENTINEL")

	if err != nil {
		return *new([32]byte), err
	}

	out0 := *abi.ConvertType(out[0], new([32]byte)).(*[32]byte)

	return out0, err

}

// OPTYPESENTINEL is a free data retrieval call binding the contract method 0x184c2588.
//
// Solidity: function OP_TYPE_SENTINEL() view returns(bytes32)
func (_SentinelInstructionSender *SentinelInstructionSenderSession) OPTYPESENTINEL() ([32]byte, error) {
	return _SentinelInstructionSender.Contract.OPTYPESENTINEL(&_SentinelInstructionSender.CallOpts)
}

// OPTYPESENTINEL is a free data retrieval call binding the contract method 0x184c2588.
//
// Solidity: function OP_TYPE_SENTINEL() view returns(bytes32)
func (_SentinelInstructionSender *SentinelInstructionSenderCallerSession) OPTYPESENTINEL() ([32]byte, error) {
	return _SentinelInstructionSender.Contract.OPTYPESENTINEL(&_SentinelInstructionSender.CallOpts)
}

// TEEEXTENSIONREGISTRY is a free data retrieval call binding the contract method 0x34759513.
//
// Solidity: function TEE_EXTENSION_REGISTRY() view returns(address)
func (_SentinelInstructionSender *SentinelInstructionSenderCaller) TEEEXTENSIONREGISTRY(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _SentinelInstructionSender.contract.Call(opts, &out, "TEE_EXTENSION_REGISTRY")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// TEEEXTENSIONREGISTRY is a free data retrieval call binding the contract method 0x34759513.
//
// Solidity: function TEE_EXTENSION_REGISTRY() view returns(address)
func (_SentinelInstructionSender *SentinelInstructionSenderSession) TEEEXTENSIONREGISTRY() (common.Address, error) {
	return _SentinelInstructionSender.Contract.TEEEXTENSIONREGISTRY(&_SentinelInstructionSender.CallOpts)
}

// TEEEXTENSIONREGISTRY is a free data retrieval call binding the contract method 0x34759513.
//
// Solidity: function TEE_EXTENSION_REGISTRY() view returns(address)
func (_SentinelInstructionSender *SentinelInstructionSenderCallerSession) TEEEXTENSIONREGISTRY() (common.Address, error) {
	return _SentinelInstructionSender.Contract.TEEEXTENSIONREGISTRY(&_SentinelInstructionSender.CallOpts)
}

// TEEMACHINEREGISTRY is a free data retrieval call binding the contract method 0xd77798a9.
//
// Solidity: function TEE_MACHINE_REGISTRY() view returns(address)
func (_SentinelInstructionSender *SentinelInstructionSenderCaller) TEEMACHINEREGISTRY(opts *bind.CallOpts) (common.Address, error) {
	var out []interface{}
	err := _SentinelInstructionSender.contract.Call(opts, &out, "TEE_MACHINE_REGISTRY")

	if err != nil {
		return *new(common.Address), err
	}

	out0 := *abi.ConvertType(out[0], new(common.Address)).(*common.Address)

	return out0, err

}

// TEEMACHINEREGISTRY is a free data retrieval call binding the contract method 0xd77798a9.
//
// Solidity: function TEE_MACHINE_REGISTRY() view returns(address)
func (_SentinelInstructionSender *SentinelInstructionSenderSession) TEEMACHINEREGISTRY() (common.Address, error) {
	return _SentinelInstructionSender.Contract.TEEMACHINEREGISTRY(&_SentinelInstructionSender.CallOpts)
}

// TEEMACHINEREGISTRY is a free data retrieval call binding the contract method 0xd77798a9.
//
// Solidity: function TEE_MACHINE_REGISTRY() view returns(address)
func (_SentinelInstructionSender *SentinelInstructionSenderCallerSession) TEEMACHINEREGISTRY() (common.Address, error) {
	return _SentinelInstructionSender.Contract.TEEMACHINEREGISTRY(&_SentinelInstructionSender.CallOpts)
}

// AttestPolicy is a paid mutator transaction binding the contract method 0xef4b73f6.
//
// Solidity: function attestPolicy(bytes _data) payable returns()
func (_SentinelInstructionSender *SentinelInstructionSenderTransactor) AttestPolicy(opts *bind.TransactOpts, _data []byte) (*types.Transaction, error) {
	return _SentinelInstructionSender.contract.Transact(opts, "attestPolicy", _data)
}

// AttestPolicy is a paid mutator transaction binding the contract method 0xef4b73f6.
//
// Solidity: function attestPolicy(bytes _data) payable returns()
func (_SentinelInstructionSender *SentinelInstructionSenderSession) AttestPolicy(_data []byte) (*types.Transaction, error) {
	return _SentinelInstructionSender.Contract.AttestPolicy(&_SentinelInstructionSender.TransactOpts, _data)
}

// AttestPolicy is a paid mutator transaction binding the contract method 0xef4b73f6.
//
// Solidity: function attestPolicy(bytes _data) payable returns()
func (_SentinelInstructionSender *SentinelInstructionSenderTransactorSession) AttestPolicy(_data []byte) (*types.Transaction, error) {
	return _SentinelInstructionSender.Contract.AttestPolicy(&_SentinelInstructionSender.TransactOpts, _data)
}

// AuthorizeDangerous is a paid mutator transaction binding the contract method 0xe2907b76.
//
// Solidity: function authorizeDangerous(bytes _data) payable returns()
func (_SentinelInstructionSender *SentinelInstructionSenderTransactor) AuthorizeDangerous(opts *bind.TransactOpts, _data []byte) (*types.Transaction, error) {
	return _SentinelInstructionSender.contract.Transact(opts, "authorizeDangerous", _data)
}

// AuthorizeDangerous is a paid mutator transaction binding the contract method 0xe2907b76.
//
// Solidity: function authorizeDangerous(bytes _data) payable returns()
func (_SentinelInstructionSender *SentinelInstructionSenderSession) AuthorizeDangerous(_data []byte) (*types.Transaction, error) {
	return _SentinelInstructionSender.Contract.AuthorizeDangerous(&_SentinelInstructionSender.TransactOpts, _data)
}

// AuthorizeDangerous is a paid mutator transaction binding the contract method 0xe2907b76.
//
// Solidity: function authorizeDangerous(bytes _data) payable returns()
func (_SentinelInstructionSender *SentinelInstructionSenderTransactorSession) AuthorizeDangerous(_data []byte) (*types.Transaction, error) {
	return _SentinelInstructionSender.Contract.AuthorizeDangerous(&_SentinelInstructionSender.TransactOpts, _data)
}

// AuthorizeSecret is a paid mutator transaction binding the contract method 0xbaf3ff3c.
//
// Solidity: function authorizeSecret(bytes _data) payable returns()
func (_SentinelInstructionSender *SentinelInstructionSenderTransactor) AuthorizeSecret(opts *bind.TransactOpts, _data []byte) (*types.Transaction, error) {
	return _SentinelInstructionSender.contract.Transact(opts, "authorizeSecret", _data)
}

// AuthorizeSecret is a paid mutator transaction binding the contract method 0xbaf3ff3c.
//
// Solidity: function authorizeSecret(bytes _data) payable returns()
func (_SentinelInstructionSender *SentinelInstructionSenderSession) AuthorizeSecret(_data []byte) (*types.Transaction, error) {
	return _SentinelInstructionSender.Contract.AuthorizeSecret(&_SentinelInstructionSender.TransactOpts, _data)
}

// AuthorizeSecret is a paid mutator transaction binding the contract method 0xbaf3ff3c.
//
// Solidity: function authorizeSecret(bytes _data) payable returns()
func (_SentinelInstructionSender *SentinelInstructionSenderTransactorSession) AuthorizeSecret(_data []byte) (*types.Transaction, error) {
	return _SentinelInstructionSender.Contract.AuthorizeSecret(&_SentinelInstructionSender.TransactOpts, _data)
}

// GetState is a paid mutator transaction binding the contract method 0xe35f157c.
//
// Solidity: function getState(bytes _data) payable returns()
func (_SentinelInstructionSender *SentinelInstructionSenderTransactor) GetState(opts *bind.TransactOpts, _data []byte) (*types.Transaction, error) {
	return _SentinelInstructionSender.contract.Transact(opts, "getState", _data)
}

// GetState is a paid mutator transaction binding the contract method 0xe35f157c.
//
// Solidity: function getState(bytes _data) payable returns()
func (_SentinelInstructionSender *SentinelInstructionSenderSession) GetState(_data []byte) (*types.Transaction, error) {
	return _SentinelInstructionSender.Contract.GetState(&_SentinelInstructionSender.TransactOpts, _data)
}

// GetState is a paid mutator transaction binding the contract method 0xe35f157c.
//
// Solidity: function getState(bytes _data) payable returns()
func (_SentinelInstructionSender *SentinelInstructionSenderTransactorSession) GetState(_data []byte) (*types.Transaction, error) {
	return _SentinelInstructionSender.Contract.GetState(&_SentinelInstructionSender.TransactOpts, _data)
}

// SetExtensionId is a paid mutator transaction binding the contract method 0xaa5032c6.
//
// Solidity: function setExtensionId() returns()
func (_SentinelInstructionSender *SentinelInstructionSenderTransactor) SetExtensionId(opts *bind.TransactOpts) (*types.Transaction, error) {
	return _SentinelInstructionSender.contract.Transact(opts, "setExtensionId")
}

// SetExtensionId is a paid mutator transaction binding the contract method 0xaa5032c6.
//
// Solidity: function setExtensionId() returns()
func (_SentinelInstructionSender *SentinelInstructionSenderSession) SetExtensionId() (*types.Transaction, error) {
	return _SentinelInstructionSender.Contract.SetExtensionId(&_SentinelInstructionSender.TransactOpts)
}

// SetExtensionId is a paid mutator transaction binding the contract method 0xaa5032c6.
//
// Solidity: function setExtensionId() returns()
func (_SentinelInstructionSender *SentinelInstructionSenderTransactorSession) SetExtensionId() (*types.Transaction, error) {
	return _SentinelInstructionSender.Contract.SetExtensionId(&_SentinelInstructionSender.TransactOpts)
}

// SentinelInstructionSenderInstructionDispatchedIterator is returned from FilterInstructionDispatched and is used to iterate over the raw logs and unpacked data for InstructionDispatched events raised by the SentinelInstructionSender contract.
type SentinelInstructionSenderInstructionDispatchedIterator struct {
	Event *SentinelInstructionSenderInstructionDispatched // Event containing the contract specifics and raw log

	contract *bind.BoundContract // Generic contract to use for unpacking event data
	event    string              // Event name to use for unpacking event data

	logs chan types.Log        // Log channel receiving the found contract events
	sub  ethereum.Subscription // Subscription for errors, completion and termination
	done bool                  // Whether the subscription completed delivering logs
	fail error                 // Occurred error to stop iteration
}

// Next advances the iterator to the subsequent event, returning whether there
// are any more events found. In case of a retrieval or parsing error, false is
// returned and Error() can be queried for the exact failure.
func (it *SentinelInstructionSenderInstructionDispatchedIterator) Next() bool {
	// If the iterator failed, stop iterating
	if it.fail != nil {
		return false
	}
	// If the iterator completed, deliver directly whatever's available
	if it.done {
		select {
		case log := <-it.logs:
			it.Event = new(SentinelInstructionSenderInstructionDispatched)
			if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
				it.fail = err
				return false
			}
			it.Event.Raw = log
			return true

		default:
			return false
		}
	}
	// Iterator still in progress, wait for either a data or an error event
	select {
	case log := <-it.logs:
		it.Event = new(SentinelInstructionSenderInstructionDispatched)
		if err := it.contract.UnpackLog(it.Event, it.event, log); err != nil {
			it.fail = err
			return false
		}
		it.Event.Raw = log
		return true

	case err := <-it.sub.Err():
		it.done = true
		it.fail = err
		return it.Next()
	}
}

// Error returns any retrieval or parsing error occurred during filtering.
func (it *SentinelInstructionSenderInstructionDispatchedIterator) Error() error {
	return it.fail
}

// Close terminates the iteration process, releasing any pending underlying
// resources.
func (it *SentinelInstructionSenderInstructionDispatchedIterator) Close() error {
	it.sub.Unsubscribe()
	return nil
}

// SentinelInstructionSenderInstructionDispatched represents a InstructionDispatched event raised by the SentinelInstructionSender contract.
type SentinelInstructionSenderInstructionDispatched struct {
	InstructionId [32]byte
	OpType        [32]byte
	OpCommand     [32]byte
	Raw           types.Log // Blockchain specific contextual infos
}

// FilterInstructionDispatched is a free log retrieval operation binding the contract event 0xcee23ef6737564df1443394629b74035062c457c95a0297b78639454eba43875.
//
// Solidity: event InstructionDispatched(bytes32 indexed instructionId, bytes32 indexed opType, bytes32 indexed opCommand)
func (_SentinelInstructionSender *SentinelInstructionSenderFilterer) FilterInstructionDispatched(opts *bind.FilterOpts, instructionId [][32]byte, opType [][32]byte, opCommand [][32]byte) (*SentinelInstructionSenderInstructionDispatchedIterator, error) {

	var instructionIdRule []interface{}
	for _, instructionIdItem := range instructionId {
		instructionIdRule = append(instructionIdRule, instructionIdItem)
	}
	var opTypeRule []interface{}
	for _, opTypeItem := range opType {
		opTypeRule = append(opTypeRule, opTypeItem)
	}
	var opCommandRule []interface{}
	for _, opCommandItem := range opCommand {
		opCommandRule = append(opCommandRule, opCommandItem)
	}

	logs, sub, err := _SentinelInstructionSender.contract.FilterLogs(opts, "InstructionDispatched", instructionIdRule, opTypeRule, opCommandRule)
	if err != nil {
		return nil, err
	}
	return &SentinelInstructionSenderInstructionDispatchedIterator{contract: _SentinelInstructionSender.contract, event: "InstructionDispatched", logs: logs, sub: sub}, nil
}

// WatchInstructionDispatched is a free log subscription operation binding the contract event 0xcee23ef6737564df1443394629b74035062c457c95a0297b78639454eba43875.
//
// Solidity: event InstructionDispatched(bytes32 indexed instructionId, bytes32 indexed opType, bytes32 indexed opCommand)
func (_SentinelInstructionSender *SentinelInstructionSenderFilterer) WatchInstructionDispatched(opts *bind.WatchOpts, sink chan<- *SentinelInstructionSenderInstructionDispatched, instructionId [][32]byte, opType [][32]byte, opCommand [][32]byte) (event.Subscription, error) {

	var instructionIdRule []interface{}
	for _, instructionIdItem := range instructionId {
		instructionIdRule = append(instructionIdRule, instructionIdItem)
	}
	var opTypeRule []interface{}
	for _, opTypeItem := range opType {
		opTypeRule = append(opTypeRule, opTypeItem)
	}
	var opCommandRule []interface{}
	for _, opCommandItem := range opCommand {
		opCommandRule = append(opCommandRule, opCommandItem)
	}

	logs, sub, err := _SentinelInstructionSender.contract.WatchLogs(opts, "InstructionDispatched", instructionIdRule, opTypeRule, opCommandRule)
	if err != nil {
		return nil, err
	}
	return event.NewSubscription(func(quit <-chan struct{}) error {
		defer sub.Unsubscribe()
		for {
			select {
			case log := <-logs:
				// New log arrived, parse the event and forward to the user
				event := new(SentinelInstructionSenderInstructionDispatched)
				if err := _SentinelInstructionSender.contract.UnpackLog(event, "InstructionDispatched", log); err != nil {
					return err
				}
				event.Raw = log

				select {
				case sink <- event:
				case err := <-sub.Err():
					return err
				case <-quit:
					return nil
				}
			case err := <-sub.Err():
				return err
			case <-quit:
				return nil
			}
		}
	}), nil
}

// ParseInstructionDispatched is a log parse operation binding the contract event 0xcee23ef6737564df1443394629b74035062c457c95a0297b78639454eba43875.
//
// Solidity: event InstructionDispatched(bytes32 indexed instructionId, bytes32 indexed opType, bytes32 indexed opCommand)
func (_SentinelInstructionSender *SentinelInstructionSenderFilterer) ParseInstructionDispatched(log types.Log) (*SentinelInstructionSenderInstructionDispatched, error) {
	event := new(SentinelInstructionSenderInstructionDispatched)
	if err := _SentinelInstructionSender.contract.UnpackLog(event, "InstructionDispatched", log); err != nil {
		return nil, err
	}
	event.Raw = log
	return event, nil
}
