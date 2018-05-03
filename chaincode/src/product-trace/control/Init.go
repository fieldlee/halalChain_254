/*
@author: lau
@email: laulucky@126.com
@date: 2018/2/7
 */
package control

import (
	"product-trace/log"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
)

type ProductTrace struct {
}

// Init takes two arguments, a string and int. These are stored in the key/value pair in the state
func (t *ProductTrace) Init(stub shim.ChaincodeStubInterface) pb.Response {
	log.Logger.Info("Init")
	return shim.Success(nil)
}
