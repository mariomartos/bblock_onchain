function ntf_setStatus(status, message) {
  const dot = document.getElementById("ntf_dot");
  const text = document.getElementById("ntf_text");

  dot.classList.remove("green", "yellow", "red");

  switch (status) {
    case Enums.STT.OK:
      dot.classList.add("green");
      break;
    case Enums.STT.WARNING:
      dot.classList.add("yellow");
      break;
    case Enums.STT.ERROR:
      dot.classList.add("red");
      break;
    case Enums.STT.NEUTRAL:
    default:
      break;
  }
console.log(message);
  text.textContent = message;
}

function ntf_setProgress(id, message) {
console.log(id + ": " + message);  
  const cntrl = document.getElementById("prg_" + id);
  if (!cntrl) return;

  let displayText = message;
  let icon = "";
  let classToApply = "";

  switch (message) {
    case "END":
      displayText = "Completado";
      icon = "✔️ ";
      classToApply = "progress-green";
      break;

    case "ERROR":
      displayText = "Error";
      icon = "❌ ";
      classToApply = "progress-red";
      break;

    default:
      classToApply = "progress-neutral";
      break;
  }

  cntrl.innerHTML = icon + displayText;

  cntrl.classList.remove("progress-green", "progress-red", "progress-neutral");
  cntrl.classList.add(classToApply);
}
