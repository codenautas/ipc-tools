"use strict";

import * as XLSX from 'xlsx';

export type CodigoProducto = 'P0001'|'P0002'|'etc...'|'A01101'|'A01102'|'A01103'|'A01201'|'A02101'|'A01201'|'A02201'
export type CodigoJerarquia = 'A'|'A1'|'A11'|'A2'|'etc...'|'A01'|'A02'|'A011'|'A012'|'A022'|'A021'
export type CodigoReparto =  CodigoJerarquia | CodigoProducto

export type ProductoARepartir={
    codigoReparto: CodigoReparto | null
    valorOriginal: number
    contenido?:null
}

export type InfoRepartiendo = {
    valorElegido?: number|null // de los elementos elegidos (que no se reparten) y la suma de ellos
    valorAgregado?: number|null // lo nuevo que tiene el nodo
    valorRepartido?: number|null // el resultado final 
}

export type JerarquiaARepartir={
    codigoPadre: CodigoJerarquia
    codigoHijo: CodigoReparto
}

export type ArbolReparto=InfoRepartiendo & ({
    contenido:{
        [codigo in CodigoReparto]?:ArbolReparto
    }
}|ProductoARepartir)

export type ArbolResultado=InfoRepartiendo & {
    contenido?:{
        [codigo in CodigoReparto]?:ArbolResultado
    }|null
}

export type PendientesARepartir = {[codigo in CodigoReparto]?:number|null}

/**
 * Los productos a repartir están marcado con un código en codigoReparto
 * Pasos:
 *   1. Suma de los valores a repartir no elegidos
 *   1. Sumar el Valor de los que quedan
 *   2. Sumar el Valor de reparto (respetando el codigoRepartir)
 *   3. Repartir hacia abajo
 */
export function reparto(arbol:ArbolReparto, codigoRaiz:CodigoJerarquia){
    var pendientes = {}
    repartoSumarValoresARepartir(arbol, pendientes);
    repartoSumarValorElegidoYReparto(arbol, codigoRaiz, pendientes);
    repartoRepartirValorRepartido(arbol, 0);
}

export function repartoSumarValoresARepartir(arbol:ArbolReparto, pendientes:PendientesARepartir){
    if(!arbol.contenido){
        if(arbol.codigoReparto != null){
            pendientes[arbol.codigoReparto] = (pendientes[arbol.codigoReparto] ?? 0) + arbol.valorOriginal;
        }
    }else{
        var codigo:CodigoReparto;
        for(codigo in arbol.contenido){
            var hijo = arbol.contenido[codigo]!
            repartoSumarValoresARepartir(hijo, pendientes);
        }
    }
}

export function repartoSumarValorElegidoYReparto(arbol:ArbolReparto, codigo:CodigoReparto, pendientes:PendientesARepartir){
    if(pendientes[codigo]){
        arbol.valorAgregado = pendientes[codigo];
    }
    if(!arbol.contenido){
        arbol.valorElegido = arbol.codigoReparto ? null : arbol.valorOriginal + (arbol.valorAgregado??0)
    }else{
        var codigoHijo:CodigoReparto;
        arbol.valorElegido = arbol.valorAgregado ?? 0;
        for(codigoHijo in arbol.contenido){
            var hijo = arbol.contenido[codigoHijo]!
            repartoSumarValorElegidoYReparto(hijo, codigoHijo, pendientes);
            arbol.valorElegido += hijo.valorElegido ?? 0;
        }
    }
    if(arbol.valorElegido == 0){
        arbol.valorElegido = null;
    }
}

export function repartoRepartirValorRepartido(arbol:ArbolReparto, sumar:number){
    if(arbol.valorElegido){
        arbol.valorRepartido = (arbol.valorElegido??0) + sumar;
        var repartir = (arbol.valorRepartido - arbol.valorElegido + (arbol.valorAgregado ?? 0)) / (arbol.valorElegido - (arbol.valorAgregado ?? 0));
    }else{
        arbol.valorRepartido = null;
        var repartir = 0;
    }
    if(arbol.contenido){
        var codigo:CodigoReparto;
        for(codigo in arbol.contenido){
            var hijo = arbol.contenido[codigo]!
            repartoRepartirValorRepartido(hijo, repartir * (hijo.valorElegido??0));
        }
    }
}

export function elegirColumna(arbol:ArbolReparto, columna:keyof InfoRepartiendo){
    var nuevoNodo:ArbolResultado = {[columna]: arbol[columna]}
    if(arbol.contenido){
        var codigo:CodigoReparto;
        nuevoNodo.contenido={}
        for(codigo in arbol.contenido){
            var hijo = arbol.contenido[codigo]!
            var nuevoHijo = elegirColumna(hijo, columna);
            nuevoNodo.contenido[codigo] = nuevoHijo;
        }
    }
    return nuevoNodo
}

export type DatosEncolumnados<NombreColumna extends string> = { columnas: NombreColumna[], filas: any[][] }
export type OpcionesNormalizarEncolumnado<NombreColumna extends string> = {
    jerarquia:NombreColumna[], 
    codigo:NombreColumna, 
    codigoReparto:NombreColumna, 
    valorOriginal:NombreColumna
}

export function normalizarEncolumnado<Columna extends string>(datos:DatosEncolumnados<Columna>, opts:OpcionesNormalizarEncolumnado<Columna>):ArbolReparto{
    var arbol:ArbolReparto = {contenido:{}}
    var posicionColumnas:{[k:string]:number} = {}
    for(var i=0; i<datos.columnas.length; i++){
        posicionColumnas[datos.columnas[i]] = i;
    }
    for(var fila of datos.filas){
        var rama:ArbolReparto = arbol;
        var contenido:NonNullable<ArbolReparto["contenido"]>;
        var grupos = [...opts.jerarquia, opts.codigo]
        var grupo:Columna;
        var codigo:CodigoReparto
        do{
            grupo = grupos.shift()!;
            codigo = fila[posicionColumnas[grupo]] as CodigoJerarquia
            contenido = rama.contenido!;
            contenido[codigo] = contenido[codigo] || {contenido:{}}
            rama = contenido[codigo]!
        }while(grupos.length);
        contenido[codigo] = {
            codigoReparto: fila[posicionColumnas[opts.codigoReparto]],
            valorOriginal: Number(fila[posicionColumnas[opts.valorOriginal]]),
        }
    }
    return arbol;
}

type DatosEnfilados={
    [columnas: string]: any,
}

export function enfilarArbol(arbol:ArbolResultado, 
    opts:{productos:boolean, grupos:boolean, niveles:number}, 
){
    function enfilarArbolInterior(
        arbol:ArbolResultado, 
        opts:{productos:boolean, grupos:boolean, niveles:number}, 
        codigo:string|undefined, 
        codigos:{[campo:string]:CodigoReparto}, 
        enfilado:DatosEnfilados[],
        nivel:number
    ){
        if(arbol.contenido ? opts.grupos : opts.productos ){
            var nivelO=opts.grupos?{nivel:nivel-1}:{}
            var linea:DatosEnfilados = {...nivelO, ...codigos};
            if(!arbol.contenido){
                linea.codigo = codigo;
            }
            var atributo:keyof ArbolResultado;
            for(atributo in arbol){
                if(atributo != 'contenido'){
                    linea[atributo] = arbol[atributo];
                }
            }
            enfilado.push(linea);
        }
        if(arbol.contenido){
            var codigoHijo: CodigoReparto
            for(codigoHijo in arbol.contenido){
                enfilarArbolInterior(
                    arbol.contenido[codigoHijo]!, 
                    opts, 
                    codigoHijo, 
                    {...codigos, [nivel==opts.niveles?'codigo':`grupo${nivel}`]: codigoHijo}, 
                    enfilado, 
                    nivel+1
                );
            }
        }
    }
    var enfilado:DatosEnfilados[] = [];
    enfilarArbolInterior(arbol, opts, undefined, {}, enfilado, 1)
    return enfilado;
}

export function encolumnarEnfilado(
    enfilado:DatosEnfilados[],
    columnasIniciales?:string[],
    niveles?:number
){
    var indiceColumnas:{[k:string]: number} = {}
    var columnas:string[] = [];
    for(let i=1; i<=(niveles||0); i++ ){
        let columna = i==niveles?`codigo`:`grupo${i}`
        indiceColumnas[columna] = columnas.push(columna)-1;
    }
    if(columnasIniciales!=null){
        for(let columna in columnasIniciales){
            if(!indiceColumnas[columna]){
                indiceColumnas[columna] = columnas.push(columna)-1;
            }
        }
    }
    var encolumnado:DatosEncolumnados<string> = {
        columnas,
        filas: [],
    }
    for(var row of enfilado){
        var linea:any[]=[];
        let agregarColumna = (columna:string, valor:any)=>{
            if(!(columna in indiceColumnas)){
                var pos = encolumnado!.columnas.push(columna) - 1;
                indiceColumnas[columna] = pos;
            }else{
                pos = indiceColumnas[columna];
            }
            while(linea.length<pos-1) linea.push(null);
            linea[pos] = valor
        }
        var atributo:keyof typeof row;
        for(atributo in row){
            agregarColumna(atributo, row[atributo]);
        }
        encolumnado.filas.push(linea);
    }
    for(var fila of encolumnado.filas){
        while(fila.length<encolumnado.columnas.length) fila.push(null);
    }
    return encolumnado;
}


export function encolumnarArbol(
    arbol:ArbolResultado, 
    opts:{productos:boolean, grupos:boolean, niveles:number}, 
){
    var enfilado = enfilarArbol(arbol, opts);
    return encolumnarEnfilado(enfilado, [], opts.niveles)
}

export function repartoEncolumnado<T extends string>(datosEncolumnados:DatosEncolumnados<T>, opts:OpcionesNormalizarEncolumnado<T>, niveles:number, grupoRaiz:CodigoJerarquia){
    var arbol = normalizarEncolumnado(datosEncolumnados, opts)
    reparto(arbol, grupoRaiz);
    var enfilado = enfilarArbol(arbol, {productos:true, grupos:false, niveles})
    return enfilado.map(row=>[row.codigo, row.valorRepartido])
}

function emptyCell(cell:XLSX.CellObject|null){
    return cell == null || cell.v == null || cell.v=='' || typeof cell.v === 'string' && cell.v.trim()=='';
}

export async function encolumnarXlsxBlob(uia:Uint8Array){
    var wb = XLSX.read(uia,{type:'array'});
    var sheetName = wb.SheetNames[0];
    if(sheetName == null){
        throw new Error("No hay hojas el en Excel");
    }
    var ws = wb.Sheets[sheetName];
    var columnas:string[]=[];
    var c=0;
    do{
        var cell = ws[XLSX.utils.encode_cell({c, r:0})]
    if(emptyCell(cell)) break;
        columnas.push(cell.v);
        c++;
    }while(true);
    var cCount = c;
    var r=1;
    var filas:(number|string|null)[][]=[];
    do{
        let cell = ws[XLSX.utils.encode_cell({c:0, r})]
    if(emptyCell(cell)) break;
        var row:any[]=[];
        for(var i=0; i<cCount; i++){
            let cell = ws[XLSX.utils.encode_cell({c:i, r})];
            row.push(emptyCell(cell)?null:cell.v);
        }
        filas.push(row);
        r++;
    }while(true);
    return { columnas, filas }
}