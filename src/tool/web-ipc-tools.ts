import * as XLSX from "xlsx";

window.addEventListener('load', function(){
    let divCargando = document.getElementById('cargando')!
    divCargando.style.display='none';
    let divRepartoTool = document.getElementById('reparto-tool')!;
    divRepartoTool.style.display='';
    let input = document.getElementById('files')!;
    input.onchange = onChange;
});

function onChange(event:Event) {
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.onload = function(e) {
      // The file's text will be printed here
      console.log(e.target.result)
      var data = new Uint8Array(e.target.result);
      var workbook = XLSX.read(data, {type: 'array'});
      alert(workbook.SheetNames.join(','))
    };
}

