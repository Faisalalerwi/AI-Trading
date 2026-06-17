export function log(message, data = null) {
    const time = new Date().toISOString();
    console.log("================================");
    console.log(time);
    console.log(message);
    if (data) {
        console.log(JSON.stringify(data, null, 2));
    }
}
