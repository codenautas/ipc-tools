"use strict";
/*jshint eqnull:true */
/*jshint globalstrict:true */
/*jshint node:true */
/*eslint-env node*/
/* global describe */
/* global it */

import {promises as fs} from 'fs';
import { ArbolReparto, ArbolResultado, 
    normalizarEncolumnado, reparto, repartoSumarValoresARepartir, repartoSumarValorElegidoYReparto, 
    elegirColumna, encolumnarArbol, enfilarArbol
} from "../tool/reparto";
import * as discrepances from 'discrepances';

// @ts-ignore
discrepances.defaultOpts.deltaNumber=0.00001;

async function compareFiles(expectedFileName:string, obtainedFileName:string){
    var expected = await fs.readFile(expectedFileName,'utf8');
    var obtained = await fs.readFile(obtainedFileName,'utf8');
    discrepances.showAndThrow(obtained, expected);
}

console.log(!!compareFiles)

// constructores de casos iniciales

function arbol1(){
    return { contenido:{
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
    }} as ArbolReparto
}

describe('Reparto completo', function(){
    it('asignación de los valores a repartir (ej: arbol1)', async function(){
        var arbol = arbol1();
        var resultado = {}
        repartoSumarValoresARepartir(arbol, resultado);
        var esperado = {A: 2, A01:20};
        discrepances.showAndThrow(resultado, esperado);
    });
    it('asignación de los valores a repartir con un código que recibe a dos', async function(){
        var arbol:ArbolReparto = {contenido:{
            A01:{contenido:{
                A01101:{codigoReparto:'A01', valorOriginal:10},
                A01102:{codigoReparto:'A01', valorOriginal:5},
            }}
        }};
        var resultado = {}
        repartoSumarValoresARepartir(arbol, resultado);
        var esperado = {A01:15};
        discrepances.showAndThrow(resultado, esperado);
    });
    it('suma del valor que queda (de los que no se reparten o sea los elegidos)', async function(){
        var arbol = arbol1();
        var pendientes = {};
        repartoSumarValoresARepartir(arbol, pendientes);
        repartoSumarValorElegidoYReparto(arbol, 'A', pendientes);
        var esperado:ArbolResultado = {
            valorElegido:100,
            contenido:{
                A01:{
                    valorElegido:97,
                    contenido:{
                        A011:{
                            valorElegido:70,
                            contenido:{
                                A01101:{valorElegido:40  },
                                A01102:{valorElegido:30  },
                                A01103:{valorElegido:null},
                            }
                        },
                        A012:{
                            valorElegido:7,
                            contenido:{
                                A01201:{valorElegido:7},
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
                                A02101:{valorElegido:null},
                            }
                        },
                        A022:{
                            valorElegido:1,
                            contenido:{
                                A02201:{valorElegido:1},
                            }
                        }
                    }
                }
            }
        }
        var arbolResultado = elegirColumna(arbol, 'valorElegido');
        discrepances.showAndThrow(arbolResultado, esperado);
    });
    it('suma del valor elegido en los niveles superiores (todo tiene que sumar en algún lugar)', async function(){
        var arbol = arbol1();
        var pendientes = {}
        repartoSumarValoresARepartir(arbol, pendientes);
        repartoSumarValorElegidoYReparto(arbol, 'A', pendientes);
        var esperado:ArbolResultado = {
            valorReparto:100,
            contenido:{
                A01:{
                    valorReparto:97,
                    contenido:{
                        A011:{
                            valorReparto:70,
                            contenido:{
                                A01101:{valorReparto:40  },
                                A01102:{valorReparto:30  },
                                A01103:{valorReparto:null },
                            }
                        },
                        A012:{
                            valorReparto:7,
                            contenido:{
                                A01201:{valorReparto:7},
                            }
                        }
                    }
                },
                A02:{
                    valorReparto:1,
                    contenido:{
                        A021:{
                            valorReparto:null,
                            contenido:{
                                A02101:{valorReparto:null},
                            }
                        },
                        A022:{
                            valorReparto:1,
                            contenido:{
                                A02201:{valorReparto:1},
                            }
                        }
                    }
                }
            }
        }
        var arbolResultado = elegirColumna(arbol, 'valorReparto');
        discrepances.showAndThrow(arbolResultado, esperado);
    });
    it('reparto de un nivel', async function(){
        var arbol:ArbolReparto={
            contenido:{
                A01:{ contenido:{
                    A01101:{valorOriginal:0.5, codigoReparto:null },
                    A01102:{valorOriginal:0.3, codigoReparto:null },
                    A01103:{valorOriginal:0.15, codigoReparto:'A01'},
                }},
                A02:{ contenido:{
                    A02101:{valorOriginal:0.05, codigoReparto:null }
                }}
            }
        }
        reparto(arbol, 'A');
        var esperado:ArbolResultado={
            valorRepartido: 1,
            contenido:{
                A01:{ valorRepartido:0.95 ,contenido:{
                    A01101:{valorRepartido:0.5 + 0.15 * 0.5 / 0.8},
                    A01102:{valorRepartido:0.3 + 0.15 * 0.3 / 0.8},
                    A01103:{valorRepartido:null},
                }},
                A02:{ valorRepartido:0.05, contenido:{
                    A02101:{valorRepartido:0.05 }
                }}
            }
        }
        var arbolResultado = elegirColumna(arbol, 'valorRepartido');
        discrepances.showAndThrow(arbolResultado, esperado);
    });
    it('normalizar encolumnados', async function(){
        var datosEncolumnados = {
            columnas:
                ["grupo1", "grupo2", "prod", "gasto", "reparto"],
            filas:[
                ["A01"   , "A011"  , "A01101", 40   , null     ],
                ["A01"   , "A011"  , "A01102", 30   , null     ],
                ["A01"   , "A012"  , "A01201", 20   , "A01"    ],
                ["A02"   , "A021"  , "A02101", 10   , null     ],
            ]
        }
        var datosNormalizados = normalizarEncolumnado(datosEncolumnados, {
            jerarquia:['grupo1', 'grupo2'], 
            codigo:'prod', 
            codigoReparto:'reparto', 
            valorOriginal:'gasto'
        });
        var esperado:ArbolReparto = {
            contenido:{
                A01:{ contenido:{
                    A011:{ contenido:{
                        A01101:{valorOriginal:40, codigoReparto:null},
                        A01102:{valorOriginal:30, codigoReparto:null}
                    }},
                    A012:{ contenido:{
                        A01201:{valorOriginal:20, codigoReparto:'A01'},
                    }},
                }},
                A02:{ contenido:{
                    A021:{ contenido:{
                        A02101:{valorOriginal:10, codigoReparto:null},
                    }},
                }},
            }
        }
        discrepances.showAndThrow(datosNormalizados, esperado);
    });
    it("enfilar un arbol",()=>{
        var arbol = arbol1();
        // @ts-ignore sé eque existe en este árbol
        arbol.contenido.A01.contenido.A011.contenido.A01103.otroDato=6;
        var encolumnado = enfilarArbol(arbol, {grupos:false, productos:true, niveles: 3});
        var esperado=[
            {grupo1: 'A01', grupo2: 'A011'  ,codigo: 'A01101', valorOriginal: 40, codigoReparto: null },
            {grupo1: 'A01', grupo2: 'A011'  ,codigo: 'A01102', valorOriginal: 30, codigoReparto: null },
            {grupo1: 'A01', grupo2: 'A011'  ,codigo: 'A01103', valorOriginal: 20, codigoReparto: 'A01', otroDato: 6   },
            {grupo1: 'A01', grupo2: 'A012'  ,codigo: 'A01201', valorOriginal:  7, codigoReparto: null },
            {grupo1: 'A02', grupo2: 'A021'  ,codigo: 'A02101', valorOriginal:  2, codigoReparto: 'A'  },
            {grupo1: 'A02', grupo2: 'A022'  ,codigo: 'A02201', valorOriginal:  1, codigoReparto: null },
        ]
        discrepances.showAndThrow(encolumnado, esperado);
    })
    it("encolumnar un arbol",()=>{
        var arbol = arbol1();
        // @ts-ignore sé eque existe en este árbol
        arbol.contenido.A01.contenido.A011.contenido.A01103.otroDato=6;
        var encolumnado = encolumnarArbol(arbol, {grupos:false, productos:true, niveles: 3});
        var esperado={
            columnas:
                ['grupo1', 'grupo2', 'codigo', 'valorOriginal', 'codigoReparto', 'otroDato'],
            filas:[
                ['A01'   , 'A011'  , 'A01101', 40             , null           , null      ],
                ['A01'   , 'A011'  , 'A01102', 30             , null           , null      ],
                ['A01'   , 'A011'  , 'A01103', 20             , 'A01'          , 6         ],
                ['A01'   , 'A012'  , 'A01201',  7             , null           , null      ],
                ['A02'   , 'A021'  , 'A02101',  2             , 'A'            , null      ],
                ['A02'   , 'A022'  , 'A02201',  1             , null           , null      ],
            ]
        }
        discrepances.showAndThrow(encolumnado, esperado);
    })
    it('reparto de un nivel', async function(){
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
        var datosNormalizados = normalizarEncolumnado(datosEncolumnados, {jerarquia:['grupo'], codigo:'prod', codigoReparto:'reparto', valorOriginal:'gasto'});
        var repartoEsperado = [
            ["A0101", 51.4285714],
            ["A0102", 38.5714285],
            ["A0103", null      ],
            ["A0201", 10        ],
        ]
        reparto(datosNormalizados, 'A');
        var resultadoEnfilado = enfilarArbol(datosNormalizados, {productos:true, grupos:false, niveles:2});
        console.log(resultadoEnfilado)
        var resultadoReparto = resultadoEnfilado.map((row:any)=>[row.codigo, row.valorRepartido])
        discrepances.showAndThrow(resultadoReparto, repartoEsperado);
    });
});

/*
describe('repartirPonderaciones', function(){
    it('reparto bien simple', async function(){
        var tabla=[
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