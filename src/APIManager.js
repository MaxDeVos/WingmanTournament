const http = require('http')
var fs = require('fs');

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

async function getTeamID(name){
    let teams = await apiCaller(`teams/`);
    for(let team in teams){
        if(teams[team].name === name){
            return teams[team]._id;
        }
    }
}

async function getCurrentTeams(){
    let currentMatch = await getCurrentMatch();
    let left = await getTeamByID(currentMatch.left.id)
    let right = await getTeamByID(currentMatch.right.id)
    return {left: left.name, right: right.name};
}

async function constructMatchDatabaseFile(match, maps){
    for(let map in maps){
        match.left = {"id": await getTeamID(maps[map].ct), "wins": 0};
        match.right = {"id": await getTeamID(maps[map].t), "wins": 0};
    }

    match.matchType = "bo3";

    match.vetos = [];

    for(let i = 0; i <= 2; i++){
        match.vetos[i] = await mapToVeto(maps[i]);
    }

    let jsonMatch = JSON.stringify(match);
    // fs.writeFile(`${__dirname}/matches`, jsonMatch, function(err, result) {
    //     if(err) console.log('error', err);
    // });
    return jsonMatch;
}

// Side = Opponent Selection.  Don't ask why, it's just how Lexogrine does it.
// Those people are batshit crazy.
async function mapToVeto(map){
    console.log(map);
    let veto = {};
    veto.teamId = await getTeamID(map.selector);
    veto.mapName = map.name;
    if(map.selector === map.t){
        veto.side = "CT";
    }
    else{
        veto.side = "T";
    }
    veto.type = "pick";
    veto.mapEnd = false;
    veto.reverseSide = false;
    return veto;
}

module.exports = {getCurrentMatch, getTeamByID, getCurrentTeams, getTeamID, constructMatchDatabaseFile};
