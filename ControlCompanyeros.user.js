// ==UserScript==
// @name           Connected coworkers
// @name:es        Compañeros conectados
// @namespace      Violentmonkey Scripts
// @match          https://intranet.iti.upv.es/*/controlhorario/
// @grant          none
// @version        0.4.0
// @author         Javier C.
// @description    Show status for ITI coworkers.
// @description:es Muestra el estado de los compañeros del ITI.
// @run-at         document-idle
// @downloadURL    https://raw.githubusercontent.com/paxet/control-companyeros/refs/heads/main/ControlCompanyeros.js
// ==/UserScript==

function divUsuario(trabajador, color) {
  return `
		<div style="color: ${color};">
			<img data-v-18dfe0cb="" width="15" height="auto" src="${trabajador.imagen}">
			[${trabajador.area}] ${trabajador.nombre} (${getTimeFormat(trabajador.tiempo)})
		</div>
        `;
}

function crearListado(trabajadores) {
  let conectados = [];
  let ausentes = [];
  let desconectados = [];
  let enVacaciones = [];

  trabajadores = trabajadores.sort((a, b) =>
    a.tiempo > b.tiempo ? 1 : b.tiempo > a.tiempo ? -1 : 0
  );
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
    conectadosHTML =
      '<div style="margin-top: 5px;"><strong style="color: #1c84c6">Conectados</strong></div>';
    conectados.forEach(t => {
      conectadosHTML += divUsuario(t, '#1c84c6');
    });
  }
  if (ausentes.length > 0) {
    ausentesHTML =
      '<div style="margin-top: 5px;"><strong style="color: #f8ac59">Ausentes</strong></div>';
    ausentes.forEach(t => {
      ausentesHTML += divUsuario(t, '#f8ac59');
    });
  }
  if (desconectados.length > 0) {
    desconectadosHTML =
      '<div style="margin-top: 5px;"><strong style="color: #ed5565">Desconectados</strong></div>';
    desconectados.forEach(t => {
      desconectadosHTML += divUsuario(t, '#ed5565');
    });
  }
  if (enVacaciones.length > 0) {
    enVacacionesHTML =
      '<div style="margin-top: 5px;"><strong style="color: #a7bf44">En vacaciones</strong></div>';
    enVacaciones.forEach(t => {
      enVacacionesHTML += divUsuario(t, '#a7bf44');
    });
  }
  const html =
    conectadosHTML + ausentesHTML + desconectadosHTML + enVacacionesHTML;
  document.getElementsByClassName('accordions-container')[0].innerHTML += html;
}

function getTimeFormat(t) {
  const today = new Date();
  if (t.getDate() === today.getDate() && t.getMonth() === today.getMonth()) {
    return t.toLocaleTimeString();
  } else {
    return t.toLocaleString();
  }
}

function httpGet(theUrl) {
  var xmlHttp = new XMLHttpRequest();
  xmlHttp.open('GET', theUrl, false); // false for synchronous request
  xmlHttp.send(null);
  return xmlHttp.responseText;
}

function getInfo(jsonString) {
  const obj = JSON.parse(jsonString);
  return {
    nombre: `${obj.person.firstname} ${obj.person.surname}`,
    available: obj.activity.available,
    estado: obj.activity.status,
    tipo: obj.activity.type,
    imagen: obj.person.image,
    tiempo: new Date(obj.activity.timestamp),
    area: obj.person.organizational_unit.abbreviation,
  };
}

function getTrabajadores(ids) {
  let infoTrabajadores = [];
  ids.forEach(id => {
    const data = httpGet(
      `https://intranet.iti.upv.es/iti-hrm/controlhorario/informe-ultimo-fichaje/persona/${id}`
    );
    infoTrabajadores.push(getInfo(data));
  });
  return infoTrabajadores;
}

function whenElementLoaded(ids) {
  const infoTrabajadores = getTrabajadores(ids);
  crearListado(infoTrabajadores);
}

(function () {
  'use strict';
  const idsTrabajadores = []; // Pon aquí los ids de tus compañeros
  var intervalID = setInterval(function () {
    if (document.getElementsByClassName('accordions-container').length) {
      clearInterval(intervalID);
      if (idsTrabajadores.length == 0) {
        let message = 'Recuerda <strong>indicar</strong> los IDs.';
        document.getElementsByClassName('accordions-container')[0].innerHTML +=
          message;
      }
      whenElementLoaded(idsTrabajadores);
    }
  }, 350);
})();
