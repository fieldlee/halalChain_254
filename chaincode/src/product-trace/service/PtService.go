/*
@author: lau
@email: laulucky@126.com
@date: 2018/2/7
 */
package service

import (
	"product-trace/module"
	"product-trace/common"
	"encoding/json"

	"github.com/hyperledger/fabric/core/chaincode/shim"
	pb "github.com/hyperledger/fabric/protos/peer"
	"strings"
	"reflect"
)

/** 产品注册**/
func Register(stub shim.ChaincodeStubInterface, param module.RegisterParam) pb.Response {
	//校验产品是否已注册
	jsonByte, err := stub.GetState(param.ProductId)
	if err != nil {
		return shim.Error("get product txList error" + err.Error())
	}
	if jsonByte != nil {
		return shim.Error("product has been register" + err.Error())
	}
	var txId = stub.GetTxID()
	var product = module.ProductInfo{}
	product.ProductId = param.ProductId
	product.ProductName = param.ProductName
	jsonByte, err = json.Marshal(product)
	if err != nil {
		return shim.Error("Mashal productInfo error" + err.Error())
	}
	//保存交易详细信息
	err = stub.PutState(txId, jsonByte)
	if err != nil {
		return shim.Error("Put productInfo error" + err.Error())
	}
	//保存产品详细信息
	err = stub.PutState(common.PRODUCT_INFO+common.ULINE+param.ProductId, jsonByte)
	if err != nil {
		return shim.Error("Put productInfo error" + err.Error())
	}
	//保存产品所属信息
	var productOwner = module.ProductOwner{}
	productOwner.PreOwner = common.SYSTEM
	productOwner.CurrentOwner = getMspid(stub)
	jsonByte, err = json.Marshal(productOwner)
	if err != nil {
		return shim.Error("Mashal productOwner error" + err.Error())
	}
	err = stub.PutState(common.PRODUCT_OWNER+common.ULINE+param.ProductId, jsonByte)
	if err != nil {
		return shim.Error("Put productOwner error" + err.Error())
	}
	//更新产品的交易基本信息列表
	err = putTxId(stub, param.ProductId, productOwner, common.REGISTER)
	if err != nil {
		return shim.Error("Put TxList error" + err.Error())
	}
	return shim.Success(nil)
}

/** 查询产品信息**/
func QueryProduct(stub shim.ChaincodeStubInterface, param module.QueryParam) pb.Response {
	//查询产品现有交易列表
	jsonByte, err := stub.GetState(param.ProductId)
	if err != nil {
		return shim.Error("get product txList error" + err.Error())
	}
	return shim.Success(jsonByte)
}

/** 查询交易信息**/
func QueryTx(stub shim.ChaincodeStubInterface, param module.QueryTxParam) pb.Response {
	//查询交易详情
	jsonByte, err := stub.GetState(param.TxId)
	if err != nil {
		return shim.Error("get tx info error" + err.Error())
	}
	return shim.Success(jsonByte)
}

/** 权属变更**/
func ChangeOwner(stub shim.ChaincodeStubInterface, param module.ChangeOrgParam) pb.Response {
	//查询产品当前所属
	productOwner, err := queryProductOwner(stub, param.ProductId)
	if err != nil {
		return shim.Error("get productOwner error" + err.Error())
	}
	//验证交易发起方是否有权限
	if getMspid(stub) != productOwner.CurrentOwner {
		return shim.Error("tx sender has no auth to change owner")
	}
	//更改产品权属信息&记录交易详情
	var changeOwner = module.ChangeOwner{}
	changeOwner.Before.PreOwner = productOwner.PreOwner
	changeOwner.Before.CurrentOwner = productOwner.CurrentOwner
	changeOwner.After.PreOwner = productOwner.CurrentOwner
	changeOwner.After.CurrentOwner = common.UNCOMFIRM + common.ULINE + strings.Replace(param.ToOrgMsgId, " ", "", -1)
	err = changeProductOwner(stub,changeOwner.Before,changeOwner.After,param.ProductId)
	if err!= nil{
		return shim.Error("change product owner error"+err.Error())
	}
	//更新产品交易列表信息
	err = putTxId(stub, param.ProductId, changeOwner.After, common.CHANGE_OWNER)
	if err != nil {
		return shim.Error("Put TxList error" + err.Error())
	}
	return shim.Success(nil)
}

/** 确认权属变更**/
func ConfirmChangeOwner(stub shim.ChaincodeStubInterface, param module.ComfirmChangeParam) pb.Response {
	//查询产品当前所属
	productOwner, err := queryProductOwner(stub, param.ProductId)
	if err != nil {
		return shim.Error("get productOwner error" + err.Error())
	}
	//验证交易发起方是否有权限
	currentOwner := productOwner.CurrentOwner
	if !strings.Contains(currentOwner, common.UNCOMFIRM) {
		return shim.Error("change tx has been confirmed")
	}
	if getMspid(stub) != currentOwner[10:] {
		return shim.Error("tx sender has no auth to confirm change owner")
	}
	//更改产品权属信息&记录交易详情
	var changeOwner = module.ChangeOwner{}
	changeOwner.Before.PreOwner = productOwner.PreOwner
	changeOwner.Before.CurrentOwner = productOwner.CurrentOwner
	changeOwner.After.PreOwner = productOwner.CurrentOwner
	changeOwner.After.CurrentOwner = currentOwner[10:]
	err = changeProductOwner(stub,changeOwner.Before,changeOwner.After,param.ProductId)
	if err!= nil{
		return shim.Error("change product owner error"+err.Error())
	}
	//更新产品交易列表信息
	err = putTxId(stub, param.ProductId, changeOwner.After, common.CONFIRM_CHANGE_OWNER)
	if err != nil {
		return shim.Error("Put TxList error" + err.Error())
	}
	return shim.Success(nil)
}

/** 产品售出销毁**/
func DestroyProduct(stub shim.ChaincodeStubInterface, param module.DestroyParam) pb.Response {
	//查询产品当前所属
	productOwner, err := queryProductOwner(stub, param.ProductId)
	if err != nil {
		return shim.Error("get productOwner error" + err.Error())
	}
	//验证交易发起方是否有权限
	if getMspid(stub) != productOwner.CurrentOwner {
		return shim.Error("tx sender has no auth to confirm change owner")
	}
	//销毁产品&记录交易详情
	var changeOwner = module.ChangeOwner{}
	changeOwner.Before.PreOwner = productOwner.PreOwner
	changeOwner.Before.CurrentOwner = productOwner.CurrentOwner
	changeOwner.After.PreOwner = productOwner.CurrentOwner
	changeOwner.After.CurrentOwner = param.SerialNum
	err = changeProductOwner(stub,changeOwner.Before,changeOwner.After,param.ProductId)
	if err!= nil{
		return shim.Error("change product owner error"+err.Error())
	}
	//更新产品交易列表信息
	err = putTxId(stub, param.ProductId, changeOwner.After, common.DESTROY)
	if err != nil {
		return shim.Error("Put TxList error" + err.Error())
	}
	return shim.Success(nil)
}

/** 产品属性变更**/
func ChangeProductInfo(stub shim.ChaincodeStubInterface, param map[string]interface{}) pb.Response {
	//查询产品当前所属
	productId := reflect.ValueOf(param[common.PRODUCT_ID]).String()
	productOwner, err := queryProductOwner(stub, productId)
	if err != nil {
		return shim.Error("get productOwner error" + err.Error())
	}
	//验证交易发起方是否有权限
	if getMspid(stub) != productOwner.CurrentOwner {
		return shim.Error("tx sender has no auth to change productInfo")
	}
	//更改产品详细信息&记录交易详情
	err = changeProductInfo(stub,param)
	if err!= nil{
		return shim.Error("change productInfo error"+err.Error())
	}
	//更新产品交易列表信息
	err = putTxId(stub, productId, productOwner, common.CHANGE_PRODUCT)
	if err != nil {
		return shim.Error("Put TxList error" + err.Error())
	}
	return shim.Success(nil)
}