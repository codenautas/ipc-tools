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
    valorElegido?: number|null
    valorRepartido?: number|null
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

/**
 * Los productos a repartir están marcado con un código en codigoReparto
 * Pasos:
 *   1. Sumar el Valor de los que quedan
 * 
 */
export function reparto(_a:ArbolReparto){

}

export function repartoSumarValorElegido(arbol:ArbolReparto){
    if(!arbol.contenido){
        arbol.valorElegido = arbol.codigoReparto ? null : arbol.valorOriginal
    }else{
        var codigo:CodigoReparto;
        arbol.valorElegido = 0;
        for(codigo in arbol.contenido){
            var hijo = arbol.contenido[codigo]!
            repartoSumarValorElegido(hijo);
            arbol.valorElegido += hijo.valorElegido ?? 0;
        }
    }
    if(arbol.valorElegido == 0){
        arbol.valorElegido = null;
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

export function normalizarEncolumnado(_a:any, _b:any):ArbolReparto{
    return { contenido:{} }
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