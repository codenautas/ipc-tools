import * as XLSX from "xlsx";
import {strict as likeAr} from "like-ar";
import {repartoEncolumnado, encolumnarXlsxBlob, DatosEncolumnados, CodigoJerarquia,
    normalizarEncolumnado, encolumnarArbol, reparto, 
} from "./reparto";

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

class TipoCampo<T> {
    constructor(private inner:{default?:T}){
    }
    get default():T|undefined{ return this.inner.default }
    parse(_str:string):T|null{
        throw new Error("parse not implemented")
    }
}

class TipoString extends TipoCampo<string> {
    parse(str:string){ return str==null || str.trim()==''?null:str }
}
class TipoStringArr extends TipoCampo<string[]> {
    parse(str:string){ return str==null || str.trim()==''?null:str.split(',') }
}
class TipoNumber extends TipoCampo<number> {
    parse(str:string){ 
        return (
            // @ts-expect-error Necesito usar str con isNaN porque JS lo permite
            isNaN(str)?
            null:Number(str) 
        )
    }
}

type DefinicionCampos={
    [k in string]: TipoCampo<any>
}

const campos={
    niveles       : new TipoNumber({}),
    grupoRaiz     : new TipoString({}),
    jerarquia     : new TipoStringArr({}),
    codigoReparto : new TipoString({}),
    valorOriginal : new TipoString({}),
    codigo        : new TipoString({}),
}

type ReturnOfDefault<T> = T extends {default:infer U | undefined} ? U : never;

type CamposValidados<T> = {
    [K in keyof T]: ReturnOfDefault<T[K]>
}

type CamposString<T> = {
    [K in keyof T]?: string
}

function recibirParametrosLibres<T extends DefinicionCampos>(o:CamposString<T>|URLSearchParams, campos:T):CamposValidados<T>{
    var getValue:(k:string)=>string|undefined|null = o instanceof URLSearchParams ? (k:keyof T) => o.get(
        //@ts-expect-error Debería saber que k es string porque se deduce de que T extends DefinicionCampos
        k
    ) : (k:keyof T) => o[k];
    // @ts-expect-error no sé cómo hacer para extender DefinicionesCampos sin perder las keys específicas
    var result: CamposValidados<T> = likeAr(campos).map((def, key)=>{
        var str = getValue(key);
        if(str == undefined){ 
            return def.default;
        }else{
            return def.parse(str)
        }
    }).plain();
    return result;
}

// console.log(new URLSearchParams({codigo: 'codigo', valorOriginal:'w', codigoReparto: 'reparto', jerarquia:['grupo1', 'grupo2'].join(','), niveles: '3', grupoRaiz: 'A'}).toString());
// codigo=codigo&valorOriginal=w&codigoReparto=reparto&jerarquia=grupo1,grupo2&niveles=3&grupoRaiz=A
// codigo=Producto_N6&valorOriginal=W&codigoReparto=Código_rep&jerarquia=Padre_N1,Padre_N2,Padre_N3,Padre_N4&niveles=5&grupoRaiz=A
// codigo=Producto_N6&valorOriginal=W&codigoReparto=Código_rep&jerarquia=Padre_N1,Padre_N2,Padre_N3,Padre_N4&niveles=5&grupoRaiz=A

function procesar(){
    var inputParametros = document.getElementById('reaprto-tool-params')! as HTMLInputElement;
    if(!inputParametros.value){
        alert("hay que especificar los parámetros");
    }else if(encolumnado == null){
        alert("hay que levantar el excel");
    }else{
        var completo = (document.getElementById('completo')! as HTMLInputElement).checked;
        var paramStr = new URLSearchParams(inputParametros.value);
        var param = recibirParametrosLibres(paramStr,campos)
        var {niveles, grupoRaiz, ...resto} = param;
        var matriz:any[][];
        if(completo){
            var arbol = normalizarEncolumnado(encolumnado, resto)
            reparto(arbol, grupoRaiz as CodigoJerarquia);
            var resultadoEncolumnado = encolumnarArbol(arbol, {productos:true, grupos:true, niveles})
            var matriz = [resultadoEncolumnado.columnas, ...resultadoEncolumnado.filas]
        }else{
            matriz = repartoEncolumnado(encolumnado, resto, niveles, grupoRaiz as CodigoJerarquia);
            matriz.unshift(['codigo','valorRepartido']);
        }
        var ws = XLSX.utils.aoa_to_sheet(matriz);
        var wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'reparto');
        XLSX.writeFile(wb, 'reparto.xlsx', {bookType:'xlsx', bookSST:false, type: 'binary'})
    }
}