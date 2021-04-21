"use strict";

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
    valorReparto?: number|null // de los elementos elegidos y de los repartidos en el código donde se repartan
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

export function repartoSumarValorElegidoYReparto(arbol:ArbolReparto, codigoPadre:CodigoReparto, pendientes:PendientesARepartir){
    if(!arbol.contenido){
        arbol.valorElegido = arbol.codigoReparto ? null : arbol.valorOriginal
        arbol.valorReparto = arbol.codigoReparto ? null : arbol.valorOriginal
    }else{
        var codigoHijo:CodigoReparto;
        if(pendientes[codigoPadre]){
            arbol.valorAgregado = pendientes[codigoPadre];
        }
        arbol.valorElegido = arbol.valorAgregado ?? 0;
        arbol.valorReparto = arbol.valorAgregado ?? 0;
        for(codigoHijo in arbol.contenido){
            var hijo = arbol.contenido[codigoHijo]!
            repartoSumarValorElegidoYReparto(hijo, codigoHijo, pendientes);
            arbol.valorElegido += hijo.valorElegido ? (hijo.valorReparto ?? 0) : 0;
            arbol.valorReparto += (hijo.valorReparto ?? 0);
        }
    }
    if(arbol.valorElegido == 0){
        arbol.valorElegido = null;
    }
    if(arbol.valorReparto == 0){
        arbol.valorReparto = null;
    }
}

export function repartoRepartirValorRepartido(arbol:ArbolReparto, sumar:number){
    if(!!arbol.valorElegido){
        arbol.valorRepartido = (arbol.valorReparto??0) + sumar;
        var repartir = arbol.valorRepartido - arbol.valorElegido + (arbol.valorAgregado ?? 0);
        if(arbol.contenido){
            var codigo:CodigoReparto;
            for(codigo in arbol.contenido){
                var hijo = arbol.contenido[codigo]!
                repartoRepartirValorRepartido(hijo, repartir * (hijo.valorElegido??0)/(arbol.valorElegido - (arbol.valorAgregado ?? 0)));
            }
        }
    }else{
        arbol.valorRepartido = null;
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
            valorOriginal: fila[posicionColumnas[opts.valorOriginal]],
        }
    }
    return arbol;
}

export type Record<T extends string> = {[x in T]: any}

export function controlarNiveles<Keys extends string>(tabla:Record<Keys>[], columnaGrupo:Keys, columnaControlar:Keys){
    var sumadores:number[] = []
    for(var row of tabla){
        var valorAControlar = row[columnaControlar];
        var grupoDelaRow = row[columnaGrupo];
        if(sumadores[grupoDelaRow] == null){
            sumadores[grupoDelaRow] = 0;
        }
        sumadores[grupoDelaRow] = sumadores[grupoDelaRow] + valorAControlar;
    }
    var sumaNivel0 = sumadores[0];
    for(var nivelActual in sumadores){
        var sumaEsteNivel = sumadores[nivelActual];
        if(sumaEsteNivel != sumaNivel0){
            return {result:false, error:'el nivel '+nivelActual+' debía sumar '+sumaNivel0+' y suma '+sumaEsteNivel}
        }
    }
    return {
        result:true
    };
}

export type RowGasto={codigo1:string, codigo:string, w:number, repartoNivel:number|null, repartoCodigo:string|null};
export type RowReparto={codigo:string, wr:number}
export function repartirPonderaciones(tabla:RowGasto[]):RowReparto[]{
    var resultado:RowReparto[] = [];
    var montoARepartir:{[k in string]: number} = {};
    var sumaSeleccionada:{[k in string]: number} = {};
    for(var row of tabla){
        if(row.repartoNivel != null){
            montoARepartir[row.codigo1] = (montoARepartir[row.codigo1]??0) + row.w;
        }else{
            sumaSeleccionada[row.codigo1] = (sumaSeleccionada[row.codigo1]??0) + row.w
        }
    }
    for(var row of tabla){
        if(row.repartoNivel == null){
            var wRepartir = 0
            if( sumaSeleccionada[row.codigo1] != null){
                wRepartir = row.w * (montoARepartir[row.codigo1]??0) / sumaSeleccionada[row.codigo1]
            }
            resultado.push({codigo:row.codigo, wr:row.w + wRepartir});
        }
    }
    return resultado;
}