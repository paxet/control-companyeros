// ==UserScript==
// @name         Conectados
// @namespace    http://tampermonkey.net/
// @version      0.2
// @description  Trabajadores que están conectados
// @author       Juanma
// @match        https://intranet.iti.upv.es/iti-hrm/controlhorario/
// @grant        none
// ==/UserScript==

function crearListado(trabajadores) {
    let conectados = [];
    let ausentes = [];
    let desconectados = [];
    let enVacaciones = [];

    trabajadores = trabajadores.sort((a,b) => (a.tiempo > b.tiempo) ? 1 : ((b.tiempo > a.tiempo) ? -1 : 0));
    trabajadores.forEach(trabajador => {
        switch (trabajador.estado) {
            case 'available':
                conectados.push(trabajador);
                break;
            case 'away':
            case 'inactive':
                if (trabajador.tipo === 'per') {
                    enVacaciones.push(trabajador);
                } else {
                    ausentes.push(trabajador);
                }
                break;
            case 'off_work':
                desconectados.push(trabajador);
                break;
        }
    });

    let conectadosHTML = '';
    let ausentesHTML = '';
    let desconectadosHTML = '';
    let enVacacionesHTML = '';

    if (conectados.length > 0) {
        conectadosHTML = '<div style="margin-top: 5px;"><strong style="color: #1c84c6">Conectados</strong></div>';
        conectados.forEach(t => {
           conectadosHTML += `
		<div style="color: #1c84c6;">
			<img data-v-18dfe0cb="" width="15" height="auto" src="${t.imagen}">
			${t.nombre} (${getTimeFormat(t.tiempo)})
		</div>
        `;
        });
    }
    if (ausentes.length > 0) {
        ausentesHTML = '<div style="margin-top: 5px;"><strong style="color: #f8ac59">Ausentes</strong></div>';
        ausentes.forEach(t => {
           ausentesHTML += `
		<div style="color: #f8ac59;">
			<img data-v-18dfe0cb="" width="15" height="auto" src="${t.imagen}">
			${t.nombre} (${getTimeFormat(t.tiempo)})
		</div>
        `;
        });
    }
    if (desconectados.length > 0) {
        desconectadosHTML = '<div style="margin-top: 5px;"><strong style="color: #ed5565">Desconectados</strong></div>';
        desconectados.forEach(t => {
           desconectadosHTML += `
		<div style="color: #ed5565;">
            <img data-v-18dfe0cb="" width="15" height="auto" src="${t.imagen}">
			${t.nombre} (${getTimeFormat(t.tiempo)})
		</div>
        `;
        });
    }
    if (enVacaciones.length > 0) {
        enVacacionesHTML = '<div style="margin-top: 5px;"><strong style="color: #a7bf44">En vacaciones</strong></div>';
        enVacaciones.forEach(t => {
           enVacacionesHTML += `
		<div style="color: #a7bf44;">
            <img data-v-18dfe0cb="" width="15" height="auto" src="${t.imagen}">
			${t.nombre}
		</div>
        `;
        });
    }
    const html = conectadosHTML + ausentesHTML + desconectadosHTML + enVacacionesHTML;
    $($(".panel-group")[0].children[1]).after(html);
}

function getTimeFormat(t) {
    const today = new Date();
    if (t.getDate() === today.getDate() && t.getMonth() === today.getMonth()) {
        return t.toLocaleTimeString();
    } else {
        return t.toLocaleString();
    }
}

function httpGet(theUrl)
{
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.open( "GET", theUrl, false ); // false for synchronous request
    xmlHttp.send( null );
    return xmlHttp.responseText;
}

function getInfo(jsonString) {
    const obj = JSON.parse(jsonString);
    return {
        'nombre': `${obj.person.firstname} ${obj.person.surname}`,
        'available': obj.activity.available,
        'estado': obj.activity.status,
        'tipo': obj.activity.type,
        'imagen': obj.person.image,
        'tiempo': new Date(obj.activity.timestamp)
    };
}

function getTrabajadores(ids) {
    let infoTrabajadores = [];
    ids.forEach(id => {
        const data = httpGet('https://intranet.iti.upv.es/iti-hrm/controlhorario/informe-ultimo-fichaje/persona/' + id);
        infoTrabajadores.push(getInfo(data));
    });
    return infoTrabajadores;
}

function main(ids) {
    const infoTrabajadores = getTrabajadores(ids);
    crearListado(infoTrabajadores);
}

(function() {
    'use strict';
    const idsTrabajadores = []; // Pon aquí los ids de tus compañeros
    main(idsTrabajadores);
})();
