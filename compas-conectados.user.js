// ==UserScript==
// @name           Connected coworkers
// @name:es        Compañeros conectados
// @namespace      Violentmonkey Scripts
// @match          https://intranet.iti.upv.es/*/controlhorario/
// @grant          GM.getValue
// @grant          GM.setValue
// @version        0.4.0
// @author         Javier C.
// @description    Show status for ITI coworkers.
// @description:es Muestra el estado de los compañeros del ITI.
// @run-at         document-idle
// @inject-into    content
// @homepageURL
// @supportURL
// @downloadURL    https://raw.githubusercontent.com/paxet/control-companyeros/refs/heads/main/compas-conectados.user.js
// ==/UserScript==

function genUserSection(trabajador, color) {
  let userDiv = `<div style="color: ${color};">`;

  if (trabajador.estado == 'left') {
    userDiv += `
      <span id="today_help" class="badge badge-success pull-right help-badge" data-original-title="" title="${getTimeFormat(trabajador.tiempo)}">
        <strong>?</strong>
      </span>`;
  } else {
    if (trabajador.aviso) {
      userDiv += `
        <span id="today_help" class="badge badge-success pull-right help-badge" data-original-title="" title="${trabajador.aviso}">
          <strong>?</strong>
        </span>`;
    }
  }
  userDiv += `
			<img data-v-18dfe0cb="" width="15" height="auto" src="${trabajador.imagen}" alt="${trabajador.nombre}">
			[${trabajador.area}] ${trabajador.nombre}`;

  if (trabajador.tipo != 'per') {
    userDiv += ` (${getTimeFormat(trabajador.tiempo)})`;
  }
  userDiv += `	</div>`;
  return userDiv;
}

function crearListado(trabajadores) {
  let conectados = [];
  let ausentes = [];
  let desconectados = [];
  let enVacaciones = [];
  let retirados = [];

  trabajadores = trabajadores.sort((a, b) =>
    a.tiempo > b.tiempo ? 1 : b.tiempo > a.tiempo ? -1 : 0
  );
  trabajadores.forEach(trabajador => {
    //TODO: Comprobar el person.status por si ya no sigue en la empresa, ejemplo: id=252
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
      case 'left':
        retirados.push(trabajador);
        break;
    }
  });

  let conectadosHTML = '';
  let ausentesHTML = '';
  let desconectadosHTML = '';
  let enVacacionesHTML = '';
  let retiradosHTML = '';

  if (conectados.length > 0) {
    conectadosHTML =
      '<div style="margin-top: 5px;"><strong style="color: #1c84c6">Conectados</strong></div>';
    conectados.forEach(t => {
      conectadosHTML += genUserSection(t, '#1c84c6');
    });
  }
  if (ausentes.length > 0) {
    ausentesHTML =
      '<div style="margin-top: 5px;"><strong style="color: #f8ac59">Ausentes</strong></div>';
    ausentes.forEach(t => {
      ausentesHTML += genUserSection(t, '#f8ac59');
    });
  }
  if (desconectados.length > 0) {
    desconectadosHTML =
      '<div style="margin-top: 5px;"><strong style="color: #ed5565">Desconectados</strong></div>';
    desconectados.forEach(t => {
      desconectadosHTML += genUserSection(t, '#ed5565');
    });
  }
  if (enVacaciones.length > 0) {
    enVacacionesHTML =
      '<div style="margin-top: 5px;"><strong style="color: #a7bf44">En vacaciones</strong></div>';
    enVacaciones.forEach(t => {
      enVacacionesHTML += genUserSection(t, '#a7bf44');
    });
  }
  if (retirados.length > 0) {
    retiradosHTML =
      '<div style="margin-top: 5px;"><strong style="color: #444444">Contrato finalizado</strong></div>';
    retirados.forEach(t => {
      retiradosHTML += genUserSection(t, '#444444');
    });
  }
  const html =
    conectadosHTML +
    ausentesHTML +
    desconectadosHTML +
    enVacacionesHTML +
    retiradosHTML;
  return html;
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

function dataFromPersonResponse(jsonString) {
  const obj = JSON.parse(jsonString);
  //TODO: Falta el person.status
  return {
    nombre: `${obj.person.firstname} ${obj.person.surname}`,
    available: obj.activity.available,
    estado: obj.person.status == 'inactive' ? 'left' : obj.activity.status,
    tipo: obj.activity.type,
    imagen: obj.person.image,
    tiempo: new Date(obj.activity.timestamp),
    area: obj.person.organizational_unit.abbreviation,
    aviso: obj.activity.notice,
  };
}

function getTrabajadores(ids) {
  let infoTrabajadores = [];
  ids.forEach(id => {
    const data = httpGet(
      `https://intranet.iti.upv.es/iti-hrm/controlhorario/informe-ultimo-fichaje/persona/${id}`
    );
    infoTrabajadores.push(dataFromPersonResponse(data));
  });
  return infoTrabajadores;
}

function getContainerWidget() {
  let csElement = document.getElementById('coworkers-status');
  if (csElement == null) {
    const rootElement = document.getElementsByClassName(
      'accordions-container'
    )[0];

    csElement = document.createElement('div');
    csElement.setAttribute('id', 'coworkers-status');
    csElement.setAttribute("class", "panel-heading");
    rootElement.appendChild(csElement);

    let actionsSection = document.createElement('div');
    actionsSection.setAttribute("style", "display: flex; justify-content: flex-end")
    actionsSection.innerHTML = `
      <button id="add-coworker"><i class="fa fa-plus" aria-hidden="true"></i></button>
      &nbsp;
      <button id="clear-coworkers"><i class="fa fa-eraser" aria-hidden="true"></i></button>`;
    csElement.appendChild(actionsSection);

    document.getElementById('add-coworker').addEventListener('click', function () {
      addCoworker();
    });

    document.getElementById('clear-coworkers').addEventListener('click', function () {
      clearCoworkers();
    });

  }

  return csElement;
}

function getElementWidget() {
  let coworkersSection = document.getElementById('coworkers-list');
  if (coworkersSection == null) {
    coworkersSection = generateElementWidget();
  }

  return coworkersSection;
}

function generateElementWidget() {
  const csElement = getContainerWidget();
  let coworkersSection = document.createElement('div');
  coworkersSection.setAttribute('id', 'coworkers-list');
  coworkersSection.innerHTML = 'Cargando...';

  csElement.insertBefore(coworkersSection, csElement.firstChild);

  return coworkersSection;
}

function addCoworker() {
  let text = prompt('Indica el ID de tu compi', '9876');
  //TODO: Ask for login and make call to obtain ID for it.
  //TODO: Add some checks and sanitize value.
  GM.getValue('coworkers', '').then(
    function (value) {
      let cwlist = value.length >= 1 ? `${value},${text}` : text;
      GM.setValue('coworkers', cwlist);
      loadFromText(cwlist);
    },
    function (error) {
      console.log(`Error accediendo localStorage: ${error}`);
    }
  );
}

function clearCoworkers() {
  const coworkersSection = getElementWidget();
  if (coworkersSection) {
    coworkersSection.parentNode.removeChild(coworkersSection);
  }
  GM.setValue('coworkers', '');
  generateElementWidget().innerHTML = "Recuerda <strong>indicar</strong> los IDs.";
}

function loadFromText(value) {
  const coworkers = value.split(',');
  let csElement = getElementWidget();

  if (coworkers.length >= 1 && coworkers[0] != '') {
    let infoTrabajadores = getTrabajadores(coworkers);
    csElement.innerHTML = crearListado(infoTrabajadores);
  } else {
    csElement.innerHTML = 'Recuerda <strong>indicar</strong> los IDs.';
  }
}

(function () {
  'use strict';

  var intervalID = setInterval(function () {
    if (document.getElementsByClassName('accordions-container').length) {
      clearInterval(intervalID);
      GM.getValue('coworkers', '').then(
        function (value) {
          loadFromText(value);
        },
        function (error) {
          console.log(`Se produjo un error: ${error}`);
        }
      );
    }
  }, 350);
})();
