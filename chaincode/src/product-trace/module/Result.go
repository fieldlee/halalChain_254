/*
@author: lau
@email: laulucky@126.com
@date: 2018/2/7
 */
package module

//交易基本信息
type TxInfo struct {
	TxId         string `json:"txId"`
	TxType       string `json:"txType"`
	PreOwner     string `json:"preOwner"`
	CurrentOwner string `json:"currentOwner"`
	TxTime       string `json:"txTime"`
}

//产品详情
type ProductInfo struct {
	ProductId   string `json:"productId"`
	ProductName string `json:"productName"`
}

//变更所属交易详情
type ChangeOwner struct {
	Before ProductOwner `json:"before"`
	After  ProductOwner `json:"after"`
}

//确认变更所属交易详情
type ConfirmChangeOwner struct {
	Before ProductOwner `json:"before"`
	After  ProductOwner `json:"after"`
}

//产品属性变更交易详情
type ChangeProduct struct {
	Before ProductInfo `json:"before"`
	After  ProductInfo `json:"after"`
}

//产品销毁交易详情
type DestoryProduct struct {
	Before ProductOwner `json:"before"`
	After  ProductOwner `json:"after"`
}

//产品当前所属信息
type ProductOwner struct {
	PreOwner     string `json:"preOwner"`
	CurrentOwner string `json:"currentOwner"`
}
