async function dayDifference(date)
{
    return new Promise(resolve=>{
        resolve(Math.abs((date - new Date())/1000/60/60/24));
    })
}
async function hourDifference(date)
{
    return new Promise(resolve=>{
        resolve(Math.abs((date - new Date())/1000/60/60));
    })
}
function getTimestamp(today)
{
    var date = today.getFullYear()+'-'+(today.getMonth()+1)+'-'+today.getDate();
    var time = today.getHours() + ":" + today.getMinutes() + ":" + today.getSeconds();
    var dateTime = date+' '+time;
    return dateTime;
}

async function extendTime(timeStamp,daysToExtend)
{
  return new Promise(resolve =>{
    var oldTimestamp = new Date(timeStamp);
    oldTimestamp.setTime(oldTimestamp.getTime() + daysToExtend*60*60*1000);
    resolve(getTimestamp(oldTimestamp));
  })
}

async function getExpiry(days)
{
  return new Promise(resolve =>{
    var today = new Date();
    today.setTime(today.getTime() + days*60*60*1000);
    resolve(getTimestamp(today));
  })
}


module.exports = {
    dayDifference:dayDifference,
    getTimestamp:getTimestamp,
    getExpiry:getExpiry,
    extendTime:extendTime
}