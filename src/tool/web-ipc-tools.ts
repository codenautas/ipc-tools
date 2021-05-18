import * as XLSX from "xlsx";
import {repartoEncolumnado, encolumnarXlsxBlob, DatosEncolumnados} from "./reparto";

window.addEventListener('load', function(){
    let divCargando = document.getElementById('cargando')!
    divCargando.style.display='none';
    let divRepartoTool = document.getElementById('reparto-tool')!;
    divRepartoTool.style.display='';
    let input = document.getElementById('files')! as HTMLInputElement;
    input.onchange = onChange;
    let botonProcesar = document.getElementById('procesar')! as HTMLButtonElement;
    botonProcesar.onclick = procesar;
});

var encolumnado:DatosEncolumnados<string>|undefined;

function onChange(event:Event) {
    // @ts-expect-error No sé cuál es el tipo correcto
    var file = event.target.files[0];
    var reader = new FileReader();
    reader.onload = async function(e:ProgressEvent<FileReader>) {
      // The file's text will be printed here
      if(e.target == null){
          alert("Sin 'target'");
      }else{
        console.log(e.target?.result)
        if(e.target.result == null){
            alert("sin contenido");
        }else{
            // @ts-ignore
            var data = new Uint8Array(e.target.result);
            encolumnado = await encolumnarXlsxBlob(data);
            var previewDiv = document.getElementById('preview')!
            previewDiv.textContent = encolumnado.columnas.join(' | ');
        }
      }
    };
    reader.readAsArrayBuffer(file);
}

function procesar(){
    var inputParametros = document.getElementById('reaprto-tool-params')! as HTMLInputElement;
    if(!inputParametros.value){
        alert("hay que especificar los parámetros");
    }else if(encolumnado == null){
        alert("hay que levantar el excel");
    }else{
        var reparto = repartoEncolumnado(encolumnado, {codigo: 'codigo', valorOriginal:'w', codigoReparto: 'reparto', jerarquia:['grupo1', 'grupo2']}, 3, 'A');
        var ws = XLSX.utils.aoa_to_sheet(reparto);
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'reparto');
        XLSX.writeFile(wb, 'reparto.xlsx', {bookType:'xlsx', bookSST:false, type: 'binary'})
        // var wbFile = XLSX.write(wb, {bookType:'xlsx', bookSST:false, type: 'binary'});
        // var blob = new Blob([s2ab(wbFile)],{type:"application/octet-stream"});
        // var url = URL.createObjectURL(blob); 
        // var downloadElement = document.getElementById('download')! as HTMLAnchorElement;
        // downloadElement.href=url;
        // downloadElement.setAttribute("download", "reparto.xlsx");
    }
}