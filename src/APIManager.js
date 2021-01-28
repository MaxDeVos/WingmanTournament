const http = require('http')

async function apiCaller(url) {

    return new Promise(function (resolve, reject) {
        try {
            const options = {
                hostname: 'localhost',
                port: 1348,
                path: `/api/${url}`,
                method: 'GET'
            }

            const req = http.request(options, res => {
                let body = "";
                res.on('data', data => {
                    body += data;
                })
                res.on('end', data => {

                    let game = JSON.parse(body)
                    // Only `delay` is able to resolve or reject the promise
                    resolve(game);
                })
            })

            req.on('error', error => {
                console.error(error)
            })

            req.end()
        } catch (e){
            console.log(e)
            reject()
        }
    })
}

async function getCurrentMatch(){
    let matches = await apiCaller(`match`);
    for(let i in matches){
        if(matches[i].current === true){
            return matches[i];
        }
    }
}

async function getTeamByID(id){
    return await apiCaller(`teams/${id}`);
}

async function getCurrentTeams(){
    let currentMatch = await getCurrentMatch();
    let left = await getTeamByID(currentMatch.left.id)
    let right = await getTeamByID(currentMatch.right.id)
    return {left: left.name, right: right.name};
}

function handleVetos(match){

}

module.exports = {getCurrentMatch, getTeamByID, getCurrentTeams};
