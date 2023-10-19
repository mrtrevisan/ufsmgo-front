//api_url = 'https://ufsmgo.cloud.local'
  api_url = 'https://ufsmgo-gc8z.onrender.com'

class Evento {
    constructor(name, center)
    {
        this.name = name;
        this.center = center;
    }

    print()
    {
        console.log(this.name);
        console.log(this.center);
    }
}

async function api_healthcheck(){
    var healthcheck = api_url+'/healthcheck'
    var res = await fetch(healthcheck)
    if (res.status != 200) return false
    else return true
}

async function get_centro(sigla){
    if (!api_healthcheck) return

    var url = api_url+'/centro'
    if (sigla != 'all'){
        url += '/' + sigla
    }

    res = await fetch(url);
    data = await res.json();
    return data;
}

async function get_evento(centro){
    if (!api_healthcheck) return

    var url = api_url+'/evento'
    if (centro == 'all'){
        url += "/all"
    }
    else {
        url += "?centro=" + centro + "&sort=data_inicio&order=ASC" 
    }
    res = await fetch(url);
    data = await res.json();
    return data;
}

var map = L.map('map').setView([-29.7209, -53.7148], 100); // coordenadas e zoom inicial do mapa

// para outras opções de mapas, acesse: https://leaflet-extras.github.io/leaflet-providers/preview/
var osm = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
});
osm.addTo(map);


// como personalizar nossos icones
var playerIcon = L.icon({
    iconUrl: 'img/walking.png',
    iconSize: [50, 50],
    popupAnchor: [0, -40]
});

var UFSM = L.featureGroup([]).addTo(map);

const markers = []; // Array para armazenar os marcadores

const ranges = []; // Array para armazenar os ranges

const eventos = []; // Array para armazenar os eventos

var entered = false;

async function main() {

    const centros = await get_centro('all')
    const eventosAll = await get_evento('all')
    if (centros) {
        centros.forEach(centro => {
            const nome = centro.nome;
            const sigla = centro.sigla;
            var lat = centro.latitude;
            var long = centro.longitude;
            var marker = L.marker([lat,long]);
            marker.bindPopup('<b>' + nome + ' - ' + sigla + '</b>' + '<br>Universidade Federal de Santa Maria </br>');

            if (marker){
                marker.addTo(UFSM)
                var circle = L.circle([marker.getLatLng().lat, marker.getLatLng().lng ], {
                    color: 'red',
                    fillColor: '#f03',
                    fillOpacity: 0.5,
                    radius: 50,
                    draggable:false
                }).addTo(UFSM);
                
                marker = L.featureGroup([marker, circle]);
                ranges.push(circle)
                markers.push(marker)
            }
            else{
                console.log("erro no marker")
            }
            
        });
    }
    else{
        console.log("erro nos centros")
    }

    if(eventosAll)
    {
        eventosAll.forEach(evento => {
            centros.forEach(centro => {
                if (evento.centro == centro.sigla){
                    eventos.push(new Evento(evento.nome, centro.sigla))     
                }
            });
        });
    }
    else
    {
        console.log("erro nos eventos")
    }
    eventos.forEach(evento => {
        evento.print()
    });
}

// Chame a função main para iniciar o processo
main();

var box = document.getElementsByClassName('entered-box');

function open_entered_box(){
    if (box[0].style.display == 'none'){
        box[0].style.display = 'block';
    }
}

function close_entered_box(){
    if (box[0].style.display == 'block'){
        box[0].style.display = 'none';
    }
}

var gps_button = document.getElementById('gps-button');

async function get_data_from_JSON(json){
    var dados = ""
    const option = {
        year: 'numeric',
        month: ('long' || 'short' || 'numeric'),
        weekday: ('long' || 'short'),
        day: 'numeric'
    }

    
    json.forEach(e => {
        dt_ini = new Date(e.data_inicio).toLocaleDateString('pt-br', option)
        dt_fim = new Date(e.data_termino).toLocaleDateString('pt-br', option)
        var modal = 
            "<h4>" + e.nome + "</h4>" +
            "<p>Início: " + dt_ini + "</p>" +
            "<p>Fim: " + dt_fim + "</p>" +
            "<p>Local: " + e.local + "</p>" +
            '<a href="' + e.link + '" target="_blank">Link: ' + e.link + "</a>" + "<br/><br/>";
        dados += modal
    })

    if (dados == "")
        dados = "<p>Tudo quieto... <br>Não há enventos aqui por enquanto.</p>"

    return dados;
}

/// EVENTOS
UFSM.on('contextmenu', async function (e) {
    const marcadorClicado = e.layer; // Obtém o marcador clicado

    // Verifique se o marcador possui um pop-up vinculado
    if (marcadorClicado && marcadorClicado.getPopup()) {
        //  var conteudoDoPopup = marcadorClicado.getPopup().getContent();
        var sigla = marcadorClicado.getPopup().getContent().split('<br>')[0].split('<b>')[1].split('</b>')[0].split(' - ')[1];
        console.log("Clicou no marcador: " + sigla);
        
        var dados = await get_evento(sigla);
        var eventosCentro = await get_data_from_JSON(dados)
        //var eventosCentro = JSON.stringify(dados)
        //console.log(eventosCentro)


        var myModal = new bootstrap.Modal(document.getElementById('myModal'));

        // Em algum ponto posterior, você pode atualizar os campos do modal diretamente
        myModal.show(); // Exibe o modal


        document.getElementsByClassName('modal-title')[0].innerHTML = 'Eventos do ' + sigla + ':';
        document.getElementsByClassName('modal-body')[0].innerHTML = eventosCentro ;
    }
    else if(marcadorClicado && marcadorClicado.getRadius()){
        console.log("Clicou no circulo de um marcador:");
    }

    // aqui que iremos habilitar uma chamada aos eventos do centro clicado!
});


var localization, range, zoomed;

var player = L.marker([-29.7160, -53.7172],{draggable:true ,icon: playerIcon} ).bindPopup('Vamos explorar a UFSM!').addTo(map).openPopup();

var player2 = L.featureGroup().addTo(map);



// Função para pegar a localização do usuário em tempo real
watcher = navigator.geolocation.watchPosition(success, error);
console.log(watcher);
function success(position) {
    gps_button.style.display = 'none';
    const lat = position.coords.latitude;
    const lng = position.coords.longitude;

    player = player.setLatLng([lat, lng]).update();
    
    /*
    if(localization){
        map.removeLayer(localization);
        map.removeLayer(range);
    }
    localization = L.marker([lat, lng],{draggable:true}).bindPopup('Você está aqui!').addTo(player2);
    
    range = L.circle([localization.getLatLng().lat, localization.getLatLng().lng ], {
        color: 'red',
        fillColor: '#f03',
        fillOpacity: 0.5,
        radius: 50,
        draggable:true
    }).addTo(player2);

    player = L.featureGroup([localization, range]);

    if(!zoomed){
        zoomed = map.fitBounds(player.getBounds());
    }
    */

    map.setView([lat, lng]);
}
function error(err) {
    if(err.code === 1){
        alert("Please allow location access.");
    }
}

player.on('drag', function(e){
    navigator.geolocation.clearWatch(watcher);
    gps_button.style.display = 'block';
});

player.on('move', function(e){
    // distance between the current position of the marker and the center of the circle
    
    var innerEntered = false;
    var isInside = false;
    var insideOf = null;

    ranges.every(range => {
        if (isInside) return false
        
        var d = map.distance(e.latlng, range.getLatLng());

        // the marker is inside the circle when the distance is inferior to the radius
        isInside = d < range.getRadius();
        
       // let's manifest this by toggling the color
        range.setStyle({
            fillColor: isInside ? 'green' : '#f03'
        })

        if (isInside) {
            insideOf = range;
            return false
        }
        else return true
    });

    if (insideOf != null){
        var d = map.distance(e.latlng, insideOf.getLatLng());

        // the marker is inside the circle when the distance is inferior to the radius
        isInside = d < insideOf.getRadius();
        if (!isInside){
            insideOf = null;
        }
    }

    if(isInside && !entered){
        entered = true;
        pontuacao = pontuacao + 10;
        infoBox.innerHTML = 'Sua pontuação: ' + pontuacao;
        localStorage.setItem('pontuacao', pontuacao);
        open_entered_box();
    }
    else if(!isInside && entered){
        entered = false;
        close_entered_box();
    }

});