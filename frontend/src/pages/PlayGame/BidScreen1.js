// import { FlatList, StyleSheet, Text, View, Image, TouchableOpacity, Vibration, TextInput } from 'react-native'
// import React, { useEffect, useState } from 'react'
// import { StyleConstants } from '../../constants/Style.constant'
// import { currentTheme } from '../../constants/ThemeProvider'
// import { Item } from 'react-native-paper/lib/typescript/components/Drawer/Drawer'
// import Header from '../../Widget/Header'
// import { screenHeight, screenWidth } from '../../constants/Sizes.constant'
// import DropDownCom from '../../component/DropDownCom'
// import { gameList1, gameList2, gameList3, gameList4, gameList5 } from '../../enums/panaList'
// import LargeTextInput from '../../component/TextInput/LargeTextInput'
// import LargefillBtn from '../../component/Button/LargefillBtn'
// import SmallFillBtn from '../../component/Button/SmallFillBtn'
// import icon from '../../constants/image'
// import Toast from 'react-native-toast-message';
// import { postApiCall } from '../../services/AppSetting'
// import { base } from '../../constants/Data.constant'
// import AsyncStorage from '@react-native-async-storage/async-storage'
// import { postData, postDataContent } from '../../services/Ops'
// import CheckBox from '@react-native-community/checkbox';
// import { images } from '../../assets/images'
// import DatePicker from '../../component/DatePicker/DatePicker'

// export default function BidScreen(props) {
//     const { details, selectItem, status } = props.route.params
//     const [digitName, setDigitName] = useState('')
//     const [digitId, setDigitId] = useState('')
//     const [closePanaName, setClosePanaName] = useState('')
//     const [closePanaId, setClosePanaId] = useState('')
//     const [openPanaName, setOpenPanaName] = useState('')
//     const [openPanaId, setOpenPanaId] = useState('')
//     const [closeDigitName, setCloseDigitName] = useState('')
//     const [closeDigitId, setCloseDigitId] = useState('')
//     const [points, setPoints] = useState("")
//     const [loading, setLoading] = useState("")
//     const [bidData, setBidData] = useState([])
//     const [totalPoint, setTotalPoint] = useState(0)
//     const [openBidCheck, setOpenBidCheck] = useState(false)
//     const [closeBidCheck, setCloseBidCheck] = useState(false)
//     const [type, setType] = useState("T1")

//     const [sessionList, setSessionList] = useState([
//         { "label": "Open", value: "Open" },
//         { "label": "Close", value: "Close" }
//     ])
//     const [sessionId, setSessionId] = useState("")
//     const [sessionName, setSessionName] = useState([])


//     useEffect(() => {
//         const getGame = async () => {
//          //   alert( status)
//             if (status) {
//                 // setOpenBidCheck(true)
//                 setSessionList([
//                     { "label": "Open", value: "Open" },
//                     { "label": "Close", value: "Close" }
//                 ])
//                 setSessionId("Open")
//             } else {
//                 // setCloseBidCheck(true)

//                 // if (details.id != 7 && details.id != 6) {
//                 //     if (!status && !openBidCheck || details.id == 7) {
//                         setSessionList([{ "label": "Close", value: "Close" }])
//                         setSessionId("Close")

//                     // } else {
//                     //     setSessionList([
//                     //         { "label": "Open", value: "Open" },
//                     //         { "label": "Close", value: "Close" }
//                     //     ])
//                     // }
//                 // }
//             }


//         }
//         getGame()
//     }, [props])
//     const _goBack = () => {
//         props.navigation.goBack()
//     }

//     const add_bid = async () => {
//         console.log(details.name)
//         let phone = await AsyncStorage.getItem('phone');

//         if (digitId == "" && details.id < 6) {
//             // Vibration.vibrate(300);
//             Toast.show({ type: 'error', text1: "Please Select Digit" });
//         } else
//         // if (digitId == "" && details.id < 6) {
//         //     // Vibration.vibrate(300);
//         //     Toast.show({ type: 'error', text1: "Please Select Digit" });
//         // } else
//         if (points == "") {
//             // Vibration.vibrate(300);
//             Toast.show({ type: 'error', text1: "Please Enter Point Value" });
//         } else {
//             let data = [...bidData]
//             let openDigit = ""
//             let openPana = ""
//             let closeDigit = ""
//             let closePana = ""
//             if (openBidCheck) {
//                 if (details.name == "Single Digit") {
//                     openDigit = digitId
//                 }
//                 if (details.name == "Jodi Digit") {
//                     let digitArr = digitId.split("")
//                     openDigit = digitArr[0]
//                     closeDigit = digitArr[1]
//                 }
//                 if (details.id == 7) {
//                     // let digitArr = digitId.split("")
//                     openPana = digitId
//                     closePana = closePanaId
//                 }
//                 if (details.id == 6) {
//                     openPana = openPanaId
//                     closePana = closePanaId
//                     openDigit = digitId
//                     closeDigit = closeDigitId
//                 }
//                 if (details.name == "Single Pana" || details.name == "Double Pana" || details.name == "Triple Pana") {
//                     openPana = digitId
//                 }
//             }
//             if (!openBidCheck) {
//                 if (details.name == "Single Digit") {
//                     closeDigit = digitId
//                 }

//                 if (details.name == "Single Pana" || details.name == "Double Pana" || details.name == "Triple Pana") {
//                     closePana = digitId
//                 }
//             }
//             data.push({
//                 points_action: points,
//                 phone_number: phone,
//                 game_name: selectItem.games_name,
//                 game_type: details.name,
//                 session: sessionId,
//                 open_pana: openPana,
//                 open_digit: openDigit,
//                 close_pana: closePana,
//                 close_digit: closeDigit
//             })

//             console.log("----------", data)



//             setTotalPoint(Number(totalPoint) + Number(points))
//             setBidData(data)
//             setPoints("")
//             setDigitId("")
//             setCloseDigitId("")
//             setOpenPanaId("")
//             setCloseDigitId("")
//             setClosePanaId("")


//         }
//     }
//     const submit_bid = async () => {
//         console.log("=========", bidData)
//         //  setLoading(true)
//         // var formdata = new FormData();
//         // formdata.append("bids", JSON.stringify(bidData));
//         let result = await postData(base.setBid, bidData)
//         console.log("-----", JSON.stringify(result.data))
//         if (result.data.success == "1") {
//             Toast.show({ type: 'success', text1: 'Congratulations Bid !', text2: result.data.msg });
//             setLoading(false);
//             setBidData([])
//             setTotalPoint(0)

//         } else {
//             setLoading(false);
//             Toast.show({ type: 'error', text1: 'Bids Error !', text2: result.data.msg });
//             // Vibration.vibrate(300);
//         }
//     }
//     const delete_row = async (index, item) => {
//         setTotalPoint(Number(totalPoint) - Number(item.points))

//         let dataArr = [...bidData]
//         dataArr.splice(index, 1)

//         setBidData(dataArr)
//     }
//     return (
//         <View style={{ flex: 1, backgroundColor: '#fff' }}>
//             <Header
//                 leftButtonType="back"
//                 title="Bid Place"
//                 leftButtonAction={_goBack}
//                 rightButttonType="refresh"
//             />
//             <View style={{ padding: 20, flex: 6 }}>
//                 <View style={{ borderWidth: 1, padding: 10, marginTop: 20, borderRadius: 15, borderColor: "#E8C57A", backgroundColor: '#FFFAEF', }}>
//                     <Text style={[StyleConstants.textBold20, { color: currentTheme().textColor, textAlign: 'center' }]}>SINGLE ANK</Text>
//                     <View style={{ flexDirection: 'row', marginTop: 40, justifyContent: 'space-between' }}>
//                         <View style={{ justifyContent: 'center' }}>
//                             <Image source={images.calender1} style={{ height: 30, width: 30, alignSelf: 'center' }} />
//                             <DatePicker
//                                 mode="date"
//                             />

//                         </View>
//                         {/* <View style={{ top: -10, right: -10 }}> */}
//                         <DropDownCom
 
//                             placeholder={"Session"}
//                             value={sessionId}
//                             setName={setSessionName}
//                             setId={setSessionId}
//                             list={sessionList}
//                             width={screenWidth - 250}
//                             borderColor={"#E8C57A"}
//                             backgroundColor={currentTheme().White}
//                             onPress={(e) => {
//                                 setSessionId(e);
//                             }} 
//                             id={sessionId}
//                         />
//                         {/* </View> */}
//                         {details.id == 7 || details.id == 6 ?
//                             <TouchableOpacity onPress={() => {
//                                 type == "t1" ? setType("t2") : setType("t1"),
//                                 setPoints("")
//                                 setDigitId("")
//                                 setCloseDigitId("")
//                                 setOpenPanaId("")
//                                 setClosePanaId("")

//                             }}
//                                 style={{ height: 50, width: 50, marginLeft: 20, marginTop: 10 }}
//                             >
//                                 <Image source={icon.swap} style={[{ height: 30, width: 30, }]} />

//                             </TouchableOpacity>
//                             :
//                             <></>
//                         }
//                     </View>

//                 </View>
//                 <View style={styles.btncontainer}>
//                     <View style={[StyleConstants.textBold18]}>
//                         {details.id == 7 ?
//                             <>
//                                 <DropDownCom
 
//                                     search={true} 
//                                     borderColor={"#E8C57A"}
//                                     width={150}
//                                     name={"Open Pana"}
//                                     placeholder={"Open Pana"}
//                                     value={digitId}
//                                     setName={setDigitName}
//                                     setId={setDigitId}
//                                     list={[...gameList3, ...gameList4, ...gameList5]}
//                                     onPress={(e) => { setDigitId(e) }}
//                                     bgType={"White"}
//                                     id={digitId}
//                                 // key={digitId}
//                                 />
//                                 <DropDownCom
   
//                                     
//                                     borderColor={"#E8C57A"}
//                                     width={150}
//                                     name={"Close Pana"}
//                                     placeholder={"Close Pana"}
//                                     value={closePanaId}
//                                     setName={setClosePanaName}
//                                     setId={setClosePanaId}
//                                     list={[...gameList3, ...gameList4, ...gameList5]}
//                                     onPress={(e) => { setClosePanaId(e) }}
//                                     bgType={"White"}
//                                     id={closePanaId}
//                                 // key={closePanaId}
//                                 />
//                             </>
//                             : details.id == 6 ?
//                                 type == "t1" ?
//                                     <>
//                                         <DropDownCom
   
//                                             
//                                             borderColor={"#E8C57A"}
//                                             width={150}
//                                             name={"Open Digit"}
//                                             placeholder={"Open Digit"}
//                                             value={digitId}
//                                             setName={setDigitName}
//                                             setId={setDigitId}
//                                             list={gameList1}
//                                             onPress={(e) => { setDigitId(e) }}
//                                             bgType={"White"}
//                                             id={digitId}
//                                         // key={digitId}
//                                         />

//                                         <DropDownCom
   
//                                             
//                                             borderColor={"#E8C57A"}
//                                             width={150}
//                                             name={"Close Pana"}
//                                             placeholder={"Close Pana"}
//                                             value={closePanaId}
//                                             setName={setClosePanaName}
//                                             setId={setClosePanaId}
//                                             list={[...gameList3, ...gameList4, ...gameList5]}
//                                             onPress={(e) => { setClosePanaId(e) }}
//                                             bgType={"White"}
//                                             id={closePanaId}
//                                         // key={closePanaId}
//                                         />
//                                     </>
//                                     :
//                                     <>
//                                         <DropDownCom
   
//                                             
//                                             borderColor={"#E8C57A"}
//                                             width={150}
//                                             name={"Open Pana"}
//                                             placeholder={"Open Pana"}
//                                             value={openPanaId}
//                                             setName={setOpenPanaName}
//                                             setId={setOpenPanaId}
//                                             list={[...gameList3, ...gameList4, ...gameList5]}
//                                             onPress={(e) => { setOpenPanaId(e) }}
//                                             bgType={"White"}
//                                             id={openPanaId}
//                                         // key={digitId}
//                                         />

//                                         <DropDownCom
   
//                                             
//                                             borderColor={"#E8C57A"}
//                                             width={150}
//                                             name={"Close Digit"}
//                                             placeholder={"Close Digit"}
//                                             value={closeDigitId}
//                                             setName={setCloseDigitName}
//                                             setId={setCloseDigitId}
//                                             list={gameList1}
//                                             onPress={(e) => { setCloseDigitId(e) }}
//                                             bgType={"White"}
//                                             id={closeDigitId}
//                                         // key={closePanaId}
//                                         />
//                                     </>
//                                 :
//                                 <DropDownCom
   
//                                     
//                                     borderColor={"#E8C57A"}
//                                     width={150}
//                                     name={"Digit"}
//                                     placeholder={"Select Digit"}
//                                     value={digitId}
//                                     setName={setDigitName}
//                                     setId={setDigitId}
//                                     list={details.id == "1" ? gameList1 : details.id == "2" ? gameList2 : details.id == "3" ? gameList3 : details.id == "4" ? gameList4 : gameList5}
//                                     onPress={(e) => { setDigitId(e) }}
//                                     bgType={"White"}
//                                     id={digitId}
//                                     key={digitId}
//                                 />
//                         }
//                     </View>
//                     <TextInput 

//                         style={[StyleConstants.textBold18, styles.btn, { height: 50 }]}
//                         placeholder={"Point"}
//                         maxLength={10}
//                         value={points}
//                         keyboardType="number-pad"
//                         onChangeText={e => {
//                             setPoints(e);
//                         }}

//                     />


//                     <TouchableOpacity onPress={() => {
//                         add_bid();
//                     }}>
//                         <Text style={[StyleConstants.textBold18, {
//                             borderWidth: 1,
//                             // height: 40,
//                             borderColor: currentTheme().inputBorderColor,
//                             borderRadius: 5,
//                             backgroundColor: "#0AAC84",
//                             paddingHorizontal: 20,
//                             paddingVertical: 10,
//                             justifyContent: 'center'
//                         }]}>Add</Text>
//                     </TouchableOpacity>
//                 </View>


//                 {
//                     bidData.length > 0 ?
//                         <>
//                             <View
//                                 style={{ marginTop: 20, alignItems: 'center', flex: 4 }}>
//                                 <View style={styles.listcontainer}>
//                                     <Text style={[styles.listbtn, { borderTopLeftRadius: 10, flex: 3 }]}>Single Ank</Text>
//                                     <Text style={[styles.listbtn, { backgroundColor: '#2C2B51', flex: 2 }]}>Points</Text>
//                                     <Text style={[styles.listbtn, { flex: 1 }]}>Type</Text>
//                                     <Text style={[styles.listbtn, { borderTopRightRadius: 10, backgroundColor: '#2C2B51', flex: 2 }]}>Delete</Text>
//                                 </View>
//                                 <FlatList
//                                     style={{ height: screenWidth, }}
//                                     data={bidData}
//                                     renderItem={({ item, index }) => {
//                                         return (
//                                             <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: screenWidth - 40 }}>
//                                                 <Text style={[styles.dataValue, { flex: 3 }]}>{item.open_pana},{item.open_digit},{item.close_pana},{item.close_digit}</Text>
//                                                 <Text style={[styles.dataValue, { flex: 2 }]}>{item.points_action}</Text>
//                                                 <Text style={[styles.dataValue, { flex: 1 }]}>{item.session}</Text>
//                                                 <TouchableOpacity style={[styles.dataValue, { flex: 2 }]} onPress={() => { delete_row(index, item) }}>
//                                                     <Image source={icon.circleCross} style={{ height: 20, width: 20, tintColor: currentTheme().red, alignSelf: 'center' }}></Image>
//                                                 </TouchableOpacity>
//                                             </View>
//                                         )
//                                     }}
//                                 // ListFooterComponent={}
//                                 />

//                             </View>
//                             <View style={{ flex: 1 }}>
//                                 <LargefillBtn
//                                     width={screenWidth - 20}
//                                     animating={loading}
//                                     label={'SUBMIT BID ₹ ' + totalPoint}
//                                     onPress={() => {
//                                         submit_bid();
//                                     }}
//                                     backgroundColor={currentTheme().themeColor}
//                                 />
//                             </View>
//                         </>
//                         :
//                         null
//                 }

//             </View>


//         </View>
//     )
// }

// const styles = StyleSheet.create({
//     row: {
//         flex: 1,
//         alignSelf: 'center',
//         fontWeight: 'bold',
//         color: currentTheme().textColor,
//         fontSize: 15,
//         textAlign: 'center'
//     },
//     dataValue: {
//         // flex: 1,
//         alignSelf: 'center',
//         color: currentTheme().textColor,
//         fontSize: 15,
//         textAlign: 'center',
//         backgroundColor: '#ECEDF0',
//         // borderColor: currentTheme().themeColor,
//         // borderStyle: 'solid',
//         padding: 5,
//         paddingVertical: 10,
//         // borderStyle:"dotted",
//         // borderWidth: 1,

//     },
//     checkbox: {
//         flexDirection: 'row',
//         justifyContent: 'flex-start',
//         alignItems: 'center',
//         marginBottom: 10,
//         marginLeft: 4,
//     },
//     btncontainer: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         marginTop: 20,
//         // justifyContent:'center'
//         alignContent: 'center',
//         alignItems: 'center'
//     },
//     btn: {
//         borderWidth: 1,
//         // height: 40,
//         borderColor: currentTheme().inputBorderColor,
//         borderRadius: 5,
//         // backgroundColor: "#E5E7EB",
//         justifyContent: 'center',
//         paddingHorizontal: 10
//     },
//     listcontainer: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         justifyContent: 'center',
//         alignItems: 'center',
//         alignSelf: 'center'

//         // flex:2,

//     },
//     listbtn: {
//         fontSize: 16,
//         fontWeight: '500',
//         color: currentTheme().White,
//         backgroundColor: '#373661',
//         // borderWidth: 1,
//         // paddingVertical: 15,
//         // paddingHorizontal: 19,
//         padding: 5,
//         alignSelf: 'center',
//         textAlign: 'center'


//     },
//     renderlistcontainer: {
//         flexDirection: 'row',
//         marginHorizontal: 20
//         // paddingHorizontal: 30,
//         // justifyContent: 'space-between',
//     },
//     renderlistbtn: {
//         // borderWidth: 1,
//         // height: 40,
//         borderColor: currentTheme().inputBorderColor,
//         color: currentTheme().textColor,
//         // borderRadius: 5,
//         backgroundColor: "#E5E7EB",
//         width: 89,
//         // paddingHorizontal: 26,
//         paddingVertical: 12,
//         justifyContent: 'center',
//         textAlign: 'center',
//         borderLeftWidth: 1,
//         borderBottomWidth: 1
//     }

// })


import { FlatList, StyleSheet, Text, View, Image, TouchableOpacity, Vibration } from 'react-native'
import React, { useEffect, useState } from 'react'
import { StyleConstants } from '../../constants/Style.constant'
import { images } from '../../asstes/images'
import { currentTheme } from '../../constants/ThemeProvider'
import { Item } from 'react-native-paper/lib/typescript/components/Drawer/Drawer'
import Header from '../../Widget/Header'
import { screenHeight, screenWidth } from '../../constants/Sizes.constant'
import DropDownCom from '../../component/DropDownCom'
import { gameList1, gameList2, gameList3, gameList4, gameList5 } from '../../enums/panaList'
import LargeTextInput from '../../component/TextInput/LargeTextInput'
import LargefillBtn from '../../component/Button/LargefillBtn'
import SmallFillBtn from '../../component/Button/SmallFillBtn'
import icon from '../../constants/image'
import Toast from 'react-native-toast-message';
import { postApiCall } from '../../services/AppSetting'
import { base } from '../../constants/Data.constant'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { postData, postDataContent } from '../../services/Ops'
import CheckBox from '@react-native-community/checkbox';

export default function BidScreen(props) {
    const { details, selectItem, status } = props.route.params
    const [digitName, setDigitName] = useState('')
    const [digitId, setDigitId] = useState('')
    const [closePanaName, setClosePanaName] = useState('')
    const [closePanaId, setClosePanaId] = useState('')
    const [openPanaName, setOpenPanaName] = useState('')
    const [openPanaId, setOpenPanaId] = useState('')
    const [closeDigitName, setCloseDigitName] = useState('')
    const [closeDigitId, setCloseDigitId] = useState('')
    const [points, setPoints] = useState("")
    const [loading, setLoading] = useState("")
    const [bidData, setBidData] = useState([])
    const [totalPoint, setTotalPoint] = useState(0)
    const [openBidCheck, setOpenBidCheck] = useState(false)
    const [closeBidCheck, setCloseBidCheck] = useState(false)
    const [type, setType] = useState("T1")

    useEffect(() => {
        const getGame = async () => {
            //    alert(details.id)
            if (status) {
                setOpenBidCheck(true)
            } else {
                setCloseBidCheck(true)
            }
        }
        getGame()
    }, [props])
    const _goBack = () => {
        props.navigation.goBack()
    }

    const add_bid = async () => {
        console.log(details.name)
        let phone = await AsyncStorage.getItem('phone');

       
        if (points == "") {
            // Vibration.vibrate(300);
            Toast.show({ type: 'error', text1: "Please Enter Point Value" });
        } else {
            let data = [...bidData]
            let openDigit = ""
            let openPana = ""
            let closeDigit = ""
            let closePana = ""
            if (openBidCheck) {
                if (details.name == "Single Digit") {
                    openDigit = digitId
                }
                if (details.name == "Jodi Digit") {
                    let digitArr = digitId.split("")
                    openDigit = digitArr[0]
                    closeDigit = digitArr[1]
                }
                if (details.id == 7) {
                    // let digitArr = digitId.split("")
                    openPana = digitId
                    closePana = closePanaId
                }
                if (details.id == 6) {
                    openPana = openPanaId
                    closePana = closePanaId
                    openDigit = digitId
                    closeDigit = closeDigitId
                }
                if (details.name == "Single Pana" || details.name == "Double Pana" || details.name == "Triple Pana") {
                    openPana = digitId
                }
            }
            if (!openBidCheck) {
                if (details.name == "Single Digit") {
                    closeDigit = digitId
                }

                if (details.name == "Single Pana" || details.name == "Double Pana" || details.name == "Triple Pana") {
                    closePana = digitId
                }
            }
            if (openPana == "" && openDigit == "" && closePana == "" && closeDigit == "" ) {
                // Vibration.vibrate(300);
                Toast.show({ type: 'error', text1: "Please Select Digit" });
            } else{
            data.push({
                points_action: points,
                phone_number: phone,
                game_name: selectItem.games_name,
                game_type: details.name,
                session: openBidCheck ? "Open" : "Close",
                open_pana: openPana,
                open_digit: openDigit,
                close_pana: closePana,
                close_digit: closeDigit
            })

            setTotalPoint(Number(totalPoint) + Number(points))
            setBidData(data)
            setPoints("")
            setDigitId("")
            setCloseDigitId("")
            setOpenPanaId("")
            setCloseDigitId("")
            setClosePanaId("")
        }

            console.log("----------", data)



            


        }
    }
    const submit_bid = async () => {
        console.log("=========", bidData)
        //  setLoading(true)
        var formdata = new FormData();
        formdata.append("bids", JSON.stringify(bidData));
        let result = await postDataContent(base.setBid, formdata)
        console.log("-----", JSON.stringify(result))
        if (result.success == "1") {
            Toast.show({ type: 'success', text1: 'Congratulations Bid !', text2: result.msg });
            setLoading(false);
            setBidData([])
            setTotalPoint(0)

        } else {
            setLoading(false);
            Toast.show({ type: 'error', text1: 'Bids Error !', text2: result.msg });
            // Vibration.vibrate(300);
        }
    }
    const delete_row = async (index, item) => {
        setTotalPoint(Number(totalPoint) - Number(item.points))

        let dataArr = [...bidData]
        dataArr.splice(index, 1)

        setBidData(dataArr)
    }
    return (
        <View style={{ flex: 1 }}>
            <Header
                leftButtonType="back"
                title="Bid Place"
                leftButtonAction={_goBack}
                rightButttonType="refresh"
            />
            <View style={{ padding: 20, flex: 6 }}>
                <View style={{ paddingHorizontal: 30, justifyContent: 'space-between', flexDirection: 'row' }}>

                    <View style={styles.checkbox}>
                        <CheckBox
                            disabled={!status}
                            value={openBidCheck}
                            onValueChange={newValue => {
                                setOpenBidCheck(newValue)
                                setCloseBidCheck(false)
                                console.log(newValue)
                            }
                            }
                            tintColors={{
                                true: currentTheme().btnColor,
                                false: '#000',
                            }}
                        // style={{height:24,width:24}}
                        />
                        <Text
                            // onPress={()=>props.navigation.navigate("Subscription")}
                            style={{
                                color: currentTheme().textColor,
                                fontSize: 14,
                                fontWeight: '400',
                            }}>
                            Open Bid
                        </Text>
                    </View>
                    {details.id != 7 && details.id != 6 ?
                        <View style={styles.checkbox}>
                            <CheckBox
                                disabled={!status && !openBidCheck || details.id == 7}
                                value={closeBidCheck}
                                onValueChange={newValue => {
                                    setCloseBidCheck(newValue)
                                    setOpenBidCheck(false)
                                    console.log(newValue)
                                }
                                }
                                tintColors={{
                                    true: currentTheme().btnColor,
                                    false: '#000',
                                }}
                            />
                            <Text
                                // onPress={()=>props.navigation.navigate("Subscription")}
                                style={{
                                    color: currentTheme().textColor,
                                    fontSize: 14,
                                    fontWeight: '400',
                                }}>
                                Close Bid
                            </Text>
                        </View>
                        :
                        <TouchableOpacity onPress={() => {
                            type == "t1" ?  setType("t2") : setType("t1"),
                            setPoints("")
                            setDigitId("")
                            setCloseDigitId("")
                            setOpenPanaId("")
                            setClosePanaId("")

                        }}> 
                            <Image source={icon.transcation} style={[StyleConstants.icon, { alignSelf: 'flex-end', height: 30, width: 30 }]} />

                        </TouchableOpacity>
                    }

                </View>

                {details.id == 7 ?
                    <>
                        <DropDownCom
                           search={true}
                            name={"Open Pana"}
                            placeholder={"Open Pana"}
                            value={digitId}
                            setName={setDigitName}
                            setId={setDigitId}
                            list={[...gameList3, ...gameList4, ...gameList5]}
                            onPress={(e) => { setDigitId(e) }}
                            bgType={"White"}
                            id={digitId}
                        // key={digitId}
                        />
                        <DropDownCom
                           search={true}
                            name={"Close Pana"}
                            placeholder={"Close Pana"}
                            value={closePanaId}
                            setName={setClosePanaName}
                            setId={setClosePanaId}
                            list={[...gameList3, ...gameList4, ...gameList5]}
                            onPress={(e) => { setClosePanaId(e) }}
                            bgType={"White"}
                            id={closePanaId}
                        // key={closePanaId}
                        />
                    </>
                    : details.id == 6 ?
                        type == "t1" ?
                            <>
                                <DropDownCom
                                   search={true}
                                    name={"Open Digit"}
                                    placeholder={"Open Digit"}
                                    value={digitId}
                                    setName={setDigitName}
                                    setId={setDigitId}
                                    list={gameList1}
                                    onPress={(e) => { setDigitId(e) }}
                                    bgType={"White"}
                                    id={digitId}
                                // key={digitId}
                                />

                                <DropDownCom
                                   search={true}
                                    name={"Close Pana"}
                                    placeholder={"Close Pana"}
                                    value={closePanaId}
                                    setName={setClosePanaName}
                                    setId={setClosePanaId}
                                    list={[...gameList3, ...gameList4, ...gameList5]}
                                    onPress={(e) => { setClosePanaId(e) }}
                                    bgType={"White"}
                                    id={closePanaId}
                                // key={closePanaId}
                                />
                            </>
                            :
                            <>
                                <DropDownCom
                                   search={true}
                                    name={"Open Pana"}
                                    placeholder={"Open Pana"}
                                    value={openPanaId}
                                    setName={setOpenPanaName}
                                    setId={setOpenPanaId}
                                    list={[...gameList3, ...gameList4, ...gameList5]}
                                    onPress={(e) => { setOpenPanaId(e) }}
                                    bgType={"White"}
                                    id={openPanaId}
                                // key={digitId}
                                />

                                <DropDownCom
                                   search={true}
                                    name={"Close Digit"}
                                    placeholder={"Close Digit"}
                                    value={closeDigitId}
                                    setName={setCloseDigitName}
                                    setId={setCloseDigitId}
                                    list={gameList1}
                                    onPress={(e) => { setCloseDigitId(e) }}
                                    bgType={"White"}
                                    id={closeDigitId}
                                // key={closePanaId}
                                />
                            </>
                        :
                        <DropDownCom
                           search={true}
                            name={"Digit"}
                            placeholder={"Select Digit"}
                            value={digitId}
                            setName={setDigitName}
                            setId={setDigitId}
                            list={details.id == "1" ? gameList1 : details.id == "2" ? gameList2 : details.id == "3" ? gameList3 : details.id == "4" ? gameList4 : gameList5}
                            onPress={(e) => { setDigitId(e) }}
                            bgType={"White"}
                            id={digitId}
                            key={digitId}
                        />
                }
                <LargeTextInput
                    label={'Points'}
                    placeholder={'Enter Points here...'}
                    maxLength={10}
                    value={points}
                    keyboardType="number-pad"
                    onChangeText={e => {
                        setPoints(e);
                    }}
                    error=""
                />

                <SmallFillBtn
                    width={screenWidth - 20}
                    animating={loading}
                    label={'ADD BID'}
                    onPress={() => {
                        add_bid();
                    }}
                    backgroundColor={currentTheme().themeColor}
                />
                {
                    bidData.length > 0 ?
                        <>
                            <View
                                style={{ marginTop: 20, alignItems: 'center', flex: 4 }}>
                                <View style={{ flexDirection: 'row', justifyContent: 'space-between', backgroundColor: currentTheme().lightGray, padding: 10 }}>
                                    <Text style={styles.row}>Digit</Text>
                                    <Text style={styles.row}>Points</Text>
                                    <Text style={styles.row}>Type</Text>
                                    <Text style={styles.row}>Action</Text>
                                </View>
                                <FlatList
                                    style={{ height: screenWidth, }}
                                    data={bidData}
                                    renderItem={({ item, index }) => {
                                        return (
                                            <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: screenWidth - 40 }}>
                                                <Text style={styles.dataValue}>{item.open_pana}{item.open_digit}{item.close_pana}{item.close_digit}</Text>
                                                <Text style={styles.dataValue}>{item.points_action}</Text>
                                                <Text style={styles.dataValue}>{item.session}</Text>
                                                <TouchableOpacity style={styles.dataValue} onPress={() => { delete_row(index, item) }}>
                                                    <Image source={icon.circleCross} style={{ height: 20, width: 20, tintColor: currentTheme().red, alignSelf: 'center' }}></Image>
                                                </TouchableOpacity>
                                            </View>
                                        )
                                    }}
                                // ListFooterComponent={}
                                />

                            </View>
                            <View style={{ flex: 1 }}>
                                <LargefillBtn
                                    width={screenWidth - 20}
                                    animating={loading}
                                    label={'SUBMIT BID ₹ ' + totalPoint}
                                    onPress={() => {
                                        submit_bid();
                                    }}
                                    backgroundColor={currentTheme().themeColor}
                                />
                            </View>
                        </>
                        :
                        null
                }

            </View>


        </View>
    )
}

const styles = StyleSheet.create({
    row: {
        flex: 1,
        alignSelf: 'center',
        fontWeight: 'bold',
        color: currentTheme().textColor,
        fontSize: 15,
        textAlign: 'center'
    },
    dataValue: {
        flex: 1,
        alignSelf: 'center',
        color: currentTheme().textColor,
        fontSize: 15,
        textAlign: 'center',
        borderColor: currentTheme().themeColor,
        borderStyle: 'solid',
        padding: 10,
        // borderStyle:"dotted",
        borderWidth: 1,

    },
    checkbox: {
        flexDirection: 'row',
        justifyContent: 'flex-start',
        alignItems: 'center',
        marginBottom: 10,
        marginLeft: 4,
    }
})