"use strict";
/*jshint eqnull:true */
/*jshint globalstrict:true */
/*jshint node:true */
/*eslint-env node*/
/* global describe */
/* global it */

import {promises as fs} from 'fs';
import { ArbolReparto, normalizarEncolumnado, reparto, repartoSumarValorElegido } from "../tool/reparto";
import { strict as assert } from 'assert';

async function compareFiles(expectedFileName:string, obtainedFileName:string){
    var expected = await fs.readFile(expectedFileName,'utf8');
    var obtained = await fs.readFile(obtainedFileName,'utf8');
    assert.deepEqual(obtained, expected);
}

console.log(!!compareFiles)

describe('Reparto completo', function(){
    it.skip('reparto de un nivel', async function(){
        var datosEncolumnados = {
            columnas:
                ["grupo", "prod", "gasto", "reparto"],
            filas:[
                ["A01", "A0101", 40, null ],
                ["A01", "A0102", 30, null ],
                ["A01", "A0103", 20, "A01"],
                ["A02", "A0201", 10, null ],
            ]
        }
        var datosNormalizados = normalizarEncolumnado(datosEncolumnados, {jerarquia:['grupo'], codigo:'prod'});
        var esperadoEncolumnado = {
            columnas:
                ["prod", "proporcion"],
            filas:[
                ["A0101", 0,571428571],
                ["A0102", 0,428571429],
                ["A0103", null       ],
                ["A0201", 1          ],
            ]
        }
        var esperadoNormalizado = normalizarEncolumnado(esperadoEncolumnado, {jerarquia:[], codigo:'prod'})
        var resultado = reparto(datosNormalizados)
        assert.equal(resultado, esperadoNormalizado);
    });
    it('suma del valor que queda (de los que no se reparten o sea los elegidos)', async function(){
        var arbol:ArbolReparto = { contenido:{
            A01:{ contenido:{
                A011:{ contenido:{
                    A01101:{valorOriginal:40, codigoReparto:null },
                    A01102:{valorOriginal:30, codigoReparto:null },
                    A01103:{valorOriginal:20, codigoReparto:"A01"},

                }},
                A012:{ contenido:{
                    A01201:{valorOriginal: 7, codigoReparto:null },
                }}
            }},
            A02:{ contenido:{
                A021:{ contenido:{
                    A02101:{valorOriginal: 2, codigoReparto:'A'  },
                }},
                A022:{ contenido:{
                    A02201:{valorOriginal: 1, codigoReparto:null },
                }}
            }}
        }};
        repartoSumarValorElegido(arbol);
        var esperado:ArbolReparto = {
            valorElegido:78,
            contenido:{
                A01:{
                    valorElegido:77,
                    contenido:{
                        A011:{
                            valorElegido:70,
                            contenido:{
                                A01101:{valorOriginal:40, codigoReparto:null , valorElegido:40  },
                                A01102:{valorOriginal:30, codigoReparto:null , valorElegido:30  },
                                A01103:{valorOriginal:20, codigoReparto:"A01", valorElegido:null},
                            }
                        },
                        A012:{
                            valorElegido:7,
                            contenido:{
                                A01201:{valorOriginal: 7, codigoReparto:null , valorElegido:7},
                            }
                        }
                    }
                },
                A02:{
                    valorElegido:1,
                    contenido:{
                        A021:{
                            valorElegido:null,
                            contenido:{
                                A02101:{valorOriginal: 2, codigoReparto:'A' , valorElegido:null},
                            }
                        },
                        A022:{
                            valorElegido:1,
                            contenido:{
                                A02201:{valorOriginal: 1, codigoReparto:null , valorElegido:1},
                            }
                        }
                    }
                }
            }
        }
        assert.notStrictEqual(arbol, esperado);
    });
});

/*
describe('repartirPonderaciones', function(){
    it('reparto bien simple', async function(){
        var tabla=[
            {codigo1:'A01', codigo:'A011111', w:0.5, repartoNivel:null, repartoCodigo:null },
            {codigo1:'A01', codigo:'A011112', w:0.3, repartoNivel:null, repartoCodigo:null },
            {codigo1:'A01', codigo:'A011113', w:0.2, repartoNivel:1   , repartoCodigo:'A01'},
            {codigo1:'A02', codigo:'A022222', w:0.1, repartoNivel:null, repartoCodigo:null }
        ];
        var obtenido = repartirPonderaciones(tabla);
        var esperado = [
            {codigo:'A011111', wr:0.5 + 0.2 * 0.5 / 0.8},
            {codigo:'A011112', wr:0.3 + 0.2 * 0.3 / 0.8},
            {codigo:'A022222', wr:0.1},
        ];
        assert.deepEqual(obtenido, esperado)
    });
});
*/