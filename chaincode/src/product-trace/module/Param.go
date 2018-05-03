/*
@author: lau
@email: laulucky@126.com
@date: 2018/2/7
 */
package module

type RegisterParam struct {
	ProductId   string `json:"productId"`
	ProductName string `json:"productName"`
}

type ChangeOrgParam struct {
	ProductId  string `json:"productId"`
	ToOrgMsgId string `json:"toOrgMsgId"`
}

type ComfirmChangeParam struct {
	ProductId string `json:"productId"`
}

type DestroyParam struct {
	ProductId string `json:"productId"`
	SerialNum string `json:"serialNum"`
}

type QueryParam struct {
	ProductId string `json:"productId"`
}

type QueryTxParam struct {
	TxId string `json:"txId"`
}
