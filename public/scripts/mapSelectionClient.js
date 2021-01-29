let mapSelectionRunning = false;

function specStartMapSelection(maps){
    if(!mapSelectionRunning){
        let container = document.getElementById("mapSelectionContainer");
        console.log(maps)
        for(let map in maps){
            let m = map.name;
            let div = document.createElement("div");
            div.className = "mapBox";
            div.id = m;
                let title = document.createElement("p");
                title.innerText = convertMapToName(m);
                title.className = "mapTitle";
                div.id = `${m}_title`
                div.appendChild(title);
                let data = document.createElement("p");
                data.className = "mapData";
                data.id = `${m}_data`
                div.appendChild(data);
            container.appendChild(div);
        }
    }
    else{
        console.log("Rejected request to add new Map Selection UI")
    }
    mapSelectionRunning = true;
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
