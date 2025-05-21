function utl_fadeOutPanel(element, callback) {
  element.style.opacity = 1;
  (function fade() {
    if ((element.style.opacity -= 0.1) < 0) {
      element.style.display = "none";
      if (callback) callback();
    } else {
      requestAnimationFrame(fade);
    }
  })();
}

function utl_fadeInPanel(element, callback) {
  element.style.opacity = 0;
  element.style.display = "block";
  (function fade() {
    let val = parseFloat(element.style.opacity);
    if (!((val += 0.1) > 1)) {
      element.style.opacity = val;
      requestAnimationFrame(fade);
    } else if (callback) {
      callback();
    }
  })();
}

function utl_validateDates(fromInput, toInput, msgEl) {
    msgEl.style.display = 'none';
    msgEl.textContent = '';

    const fromVal = fromInput.value;
    const toVal   = toInput.value;
    if (!fromVal || !toVal) {
        msgEl.textContent = 'Debes indicar ambas fechas.';
        msgEl.style.display = 'block';
        return false;
    }

    // Validar que el año tenga 4 dígitos exactos
    const yearRegex = /^\d{4}/;
    if (!yearRegex.test(fromVal) || !yearRegex.test(toVal)) {
        msgEl.textContent = 'El año debe tener exactamente 4 dígitos.';
        msgEl.style.display = 'block';
        return false;
    }

    let fromDate = new Date(fromVal);
    let toDate = new Date(toVal);

    if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        msgEl.textContent = 'Alguna de las fechas introducidas no es correcta.';
        msgEl.style.display = 'block';
        return false;
    }

    const MIN_DATE = new Date(Date.UTC(2015, 0, 1, 0, 0, 0)); // 2015-01-01T00:00:00Z
    const NOW      = new Date();

    if (fromDate < MIN_DATE || toDate < MIN_DATE) {
        msgEl.textContent = 'Las fechas deben ser posteriores al 1 de enero de 2015.';
        msgEl.style.display = 'block';
        return false;
    }

    if (toDate > NOW) {
        toDate = NOW;
        toInput.value = toDate.toISOString().slice(0, 19);
        msgEl.textContent = 'La fecha “Hasta” era futura y se ha ajustado a la fecha/hora actual.';
        msgEl.style.display = 'block';
    }

    if (+fromDate === +toDate) {
        msgEl.textContent = 'Las fechas “Desde” y “Hasta” no pueden ser idénticas.';
        msgEl.style.display = 'block';
        return false;
    }

    if (fromDate > toDate) {
        // Intercambiamos valores
        const tempFrom = fromDate;
        fromDate = toDate;
        toDate = tempFrom;

        // Si after swap fromDate > NOW, ajustamos fromDate a NOW también
        if (fromDate > NOW) {
            fromDate = NOW;
            msgEl.textContent = 'Después del intercambio, la fecha “Desde” era futura y se ha ajustado a la fecha/hora actual.';
            msgEl.style.display = 'block';
        } else {
            msgEl.textContent = '“Desde” era posterior a “Hasta”. Se han intercambiado los valores.';
            msgEl.style.display = 'block';
        }

        // Actualizamos valores en los inputs en formato correcto (sin zona horaria)
        fromInput.value = fromDate.toISOString().slice(0, 19);
        toInput.value   = toDate.toISOString().slice(0, 19);
    }

    return true;
}
