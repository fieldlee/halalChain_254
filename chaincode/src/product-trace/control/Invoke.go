/*
@author: lau
@email: laulucky@126.com
@date: 2018/2/7
 */
package control

import (
	"product-trace/service"
	"product-trace/log"
	"product-trace/module"
	"encoding/json"
	"strconv"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
	"product-trace/common"
)

// Invoke is called by fabric to execute a transaction
func (t *ProductTrace) Invoke(stub shim.ChaincodeStubInterface) pb.Response {
	log.Logger.Info("###########调用invoke开始############")
	function, args := stub.GetFunctionAndParameters()
	log.Logger.Info("###########function:", function)
	if len(args) <= 0 {
		return shim.Error("Invoke args error. " + strconv.Itoa(len(args)))
	}
	if args[0] == "Register" {
		return t.Register(stub, args[1:])
	} else if args[0] == "QueryProduct" {
		return t.QueryProduct(stub, args[1:])
	} else if args[0] == "ChangeOwner" {
		return t.ChangeOwner(stub, args[1:])
	} else if args[0] == "ConfirmChangeOwner" {
		return t.ConfirmChangeOwner(stub, args[1:])
	} else if args[0] == "DestroyProduct" {
		return t.DestroyProduct(stub, args[1:])
	} else if args[0] == "QueryTx" {
		return t.QueryTx(stub, args[1:])
	} else if args[0] == "ChangeProduct"{
		return t.ChangeProductInfo(stub,args[1:])
	}
	return shim.Error("Invalid invoke function name. " + args[0])
}

/**
注册产品信息入口
**/
func (t *ProductTrace) Register(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	log.Logger.Info("##############调用产品注册接口开始###############")
	if len(args) < 1 {
		return shim.Error("Register:Incorrect number of arguments. Incorrect number is : " + strconv.Itoa(len(args)))
	}
	var Param module.RegisterParam
	err := json.Unmarshal([]byte(args[0]), &Param)
	if err != nil {
		log.Logger.Error("######解析传入报文参数报错", err)
		return shim.Error("Unmarshal Register args[0] Error," + err.Error())
	}
	return service.Register(stub, Param)
}

/**
变更产品所属信息入口
**/
func (t *ProductTrace) ChangeOwner(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	log.Logger.Info("##############调用变更产品所属接口开始###############")
	if len(args) < 1 {
		return shim.Error("ChangeOwner:Incorrect number of arguments. Incorrect number is : " + strconv.Itoa(len(args)))
	}
	var Param module.ChangeOrgParam
	err := json.Unmarshal([]byte(args[0]), &Param)
	if err != nil {
		log.Logger.Error("######解析传入报文参数报错", err)
		return shim.Error("Unmarshal ChangeOwner args[0] Error," + err.Error())
	}
	return service.ChangeOwner(stub, Param)
}

/**
确认产品权属变更接口入口
**/
func (t *ProductTrace) ConfirmChangeOwner(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	log.Logger.Info("##############调用确认产品权属变更接口开始###############")
	if len(args) < 1 {
		return shim.Error("ConfirmChangeOwner:Incorrect number of arguments. Incorrect number is : " + strconv.Itoa(len(args)))
	}
	var Param module.ComfirmChangeParam
	err := json.Unmarshal([]byte(args[0]), &Param)
	if err != nil {
		log.Logger.Error("######解析传入报文参数报错", err)
		return shim.Error("Unmarshal ConfirmChangeOwner args[0] Error," + err.Error())
	}
	return service.ConfirmChangeOwner(stub, Param)
}

/**
产品销毁入口
**/
func (t *ProductTrace) DestroyProduct(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	log.Logger.Info("##############调用产品销毁接口开始###############")
	if len(args) < 1 {
		return shim.Error("DestroyProduct:Incorrect number of arguments. Incorrect number is : " + strconv.Itoa(len(args)))
	}
	var Param module.DestroyParam
	err := json.Unmarshal([]byte(args[0]), &Param)
	if err != nil {
		log.Logger.Error("######解析传入报文参数报错", err)
		return shim.Error("Unmarshal DestroyProduct args[0] Error," + err.Error())
	}
	return service.DestroyProduct(stub, Param)
}

/**
查询产品信息入口
**/
func (t *ProductTrace) QueryProduct(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	log.Logger.Info("##############调用查询产品信息接口开始###############")
	if len(args) < 1 {
		return shim.Error("QueryProduct:Incorrect number of arguments. Incorrect number is : " + strconv.Itoa(len(args)))
	}
	var Param module.QueryParam
	err := json.Unmarshal([]byte(args[0]), &Param)
	if err != nil {
		log.Logger.Error("######解析传入报文参数报错", err)
		return shim.Error("Unmarshal QueryProduct args[0] Error," + err.Error())
	}
	return service.QueryProduct(stub, Param)
}

/**
查询交易详情入口
**/
func (t *ProductTrace) QueryTx(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	log.Logger.Info("##############调用查询交易信息接口开始###############")
	if len(args) < 1 {
		return shim.Error("QueryTx:Incorrect number of arguments. Incorrect number is : " + strconv.Itoa(len(args)))
	}
	var Param module.QueryTxParam
	err := json.Unmarshal([]byte(args[0]), &Param)
	if err != nil {
		log.Logger.Error("######解析传入报文参数报错", err)
		return shim.Error("Unmarshal QueryTx args[0] Error," + err.Error())
	}
	return service.QueryTx(stub, Param)
}

/**
变更产品属性入口
**/
func (t *ProductTrace) ChangeProductInfo(stub shim.ChaincodeStubInterface, args []string) pb.Response {
	log.Logger.Info("##############调用变更产品属性接口开始###############")
	if len(args) < 1 {
		return shim.Error("ChangeProductInfo:Incorrect number of arguments. Incorrect number is : " + strconv.Itoa(len(args)))
	}
	log.Logger.Info("args:",args[0])
	param,err := common.Json2map(args[0])
	if err != nil {
		log.Logger.Error("######解析传入报文参数报错", err)
		return shim.Error("Convert args[0] to map error," + err.Error())
	}
	return service.ChangeProductInfo(stub, param)
}
