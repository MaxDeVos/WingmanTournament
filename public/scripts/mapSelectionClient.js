function configSockets(socket){
    socket.on('ban-spec', (maps) => {
        updateMapList(maps);
    })

    socket.on('pick-spec', (maps) => {
        updateMapList(maps);
    })

    socket.on('side-pick-spec', (maps) => {
        updateMapList(maps);
    })

    socket.on('start-map-selection', (maps) => {
        specStartMapSelection(maps)
    });

    socket.on('map-selection-complete', (maps) => {
        // alert("Map Selection Complete");
    });
}

let mapSelectionRunning = false;

function specStartMapSelection(maps){
    let container = document.getElementById("mapSelectionContainer");
    console.log(maps)
    for(let map in maps){
        let m = maps[map];
        console.log(m.name);
        let mapNameString = convertMapToName(m.name);
        let cont = document.createElement("div");
        cont.className = "mapContainer"
        cont.id = m.name;

            let mapBox = document.createElement("div");
            mapBox.className = "mapBox";

            let title = document.createElement("p");
            title.innerText = mapNameString;
            title.className = "mapTitle";
            title.id = `${m.name}_title`
            mapBox.appendChild(title);

            let image = document.createElement("img");
            image.className = "mapImage";
            image.id = `${m.name}_image`
            image.src = getMapImage(m.name);
            mapBox.appendChild(image);

            let data = document.createElement("div");
            data.classList.add("mapData");
            data.id = `${m.name}_data`;
            mapBox.appendChild(data);

                let selectedByTitle = document.createElement("p");
                selectedByTitle.className = "dataTitle";
                selectedByTitle.id = `${m.name}_selectedByTitle`;
                data.appendChild(selectedByTitle);

                let selectedBy = document.createElement("p");
                selectedBy.classList.add("data");
                selectedBy.id = `${m.name}_selectedBy`;
                data.appendChild(selectedBy);

                let tTeam = document.createElement("p");
                tTeam.className = "teamSide";
                tTeam.id = `${m.name}_t`;
                data.appendChild(tTeam);

                let ctTeam = document.createElement("p");
                ctTeam.className = "teamSide";
                ctTeam.id = `${m.name}_ct`;
                data.appendChild(ctTeam);

                let mapOrder = document.createElement("p");
                mapOrder.className = "mapOrder";
                mapOrder.id = `${m.name}_mapOrder`;
                data.appendChild(mapOrder);``

        cont.appendChild(mapBox);

        container.appendChild(cont);
    }
}

function updateMapList(maps){
    for(let m in maps){
        let map = maps[m];
        console.log(map);
        if(isMapBanned(map)){
            console.log("Setting Banned to ", map.name);
            document.getElementById(map.name).style.backgroundColor = "lightcoral"
            document.getElementById(`${map.name}_selectedByTitle`).textContent = "Banned By";
            document.getElementById(`${map.name}_selectedBy`).textContent = map.selector;
        }
        else if(isMapPicked(map)){
            console.log("Setting Picked to ", map.name);
            document.getElementById(map.name).style.backgroundColor = "MediumSeaGreen"
            document.getElementById(`${map.name}_selectedByTitle`).textContent = "Picked By";
            document.getElementById(`${map.name}_selectedBy`).textContent = map.selector;
            document.getElementById(`${map.name}_mapOrder`).textContent = `Map #${map.order}`;

            if(map.ct !== undefined){
                document.getElementById(`${map.name}_t`).textContent = map.t;
                document.getElementById(`${map.name}_t`).style.fontSize = "12px";
                document.getElementById(`${map.name}_t`).style.color = "gold";
                document.getElementById(`${map.name}_t`).style.fontWeight = "600";

                document.getElementById(`${map.name}_ct`).textContent = map.ct;
                document.getElementById(`${map.name}_ct`).style.fontSize = "12px";
                document.getElementById(`${map.name}_ct`).style.color = "navy";
                document.getElementById(`${map.name}_ct`).style.fontWeight = "600";
            }
        }
        else{
            // console.log("Setting Available to ", map.name);
            document.getElementById(map.name).style.backgroundColor = "white"
        }
    }
}

function convertMapToName(name){
    let string;
    if(name === "de_shortnuke"){
        string = "Nuke"
    }
    else{
        string = name.replace("de_","");
        string = string.charAt(0).toUpperCase() + string.slice(1);
    }
    return string;
}

function getMapImage(name){
    let string;
    string = name.replace("de_","");
    return "/media/maps/" + string + ".jpg";
}

function isMapAvailable(name){
    return (name.status === "available");
}

function isMapPicked(name){
    return (name.status === "picked");
}

function isMapBanned(name){
    return (name.status === "banned");
}
