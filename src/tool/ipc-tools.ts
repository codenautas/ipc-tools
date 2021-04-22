import { promises as fs } from "fs";
import { argv } from "process";
import { CodigoJerarquia, DatosEncolumnados, /*normalizarEncolumnado, reparto,*/ repartoEncolumnado } from "./reparto"

var SEPARATOR = ';'

async function main(){
    try{
        if(argv[2]=='reparto'){
            var fileContent = (await fs.readFile(argv[3], {encoding: 'utf-8'})).replace(/\uFEFF/g,'');
            var rows = fileContent.split(/\r?\n/);
            var opts = {jerarquia:argv[4].split(','), codigo:argv[5], valorOriginal:argv[6], codigoReparto:argv[7]};
            var codigoRaiz = argv[9] as CodigoJerarquia;
            var encolumnado:DatosEncolumnados<string> = {
                columnas:rows[0].split(SEPARATOR),
                filas:rows.slice(1).map(row=>row.split(SEPARATOR).map(cell=>/^\s*$/.test(cell)?null:cell.replace(/,/,'.')))
            }
            /*
            console.log('call', opts, Number(argv[8]), argv[9] as CodigoJerarquia)
            fs.writeFile('local-encolumnado.json', JSON.stringify(encolumnado, null, '  '), {encoding:'utf8'})
            var arbol = normalizarEncolumnado(encolumnado, opts);
            await fs.writeFile('local-arbol.json', JSON.stringify(arbol, null, '  '), {encoding:'utf8'})
            reparto(arbol, codigoRaiz)
            await fs.writeFile('local-arbol-repartido.json', JSON.stringify(arbol, null, '  '), {encoding:'utf8'})
            */
            var resultado = repartoEncolumnado(encolumnado, opts, Number(argv[8]), codigoRaiz);
            process.stdout.write(resultado.map(linea=>linea.join(SEPARATOR)).join('\r\n'))
        }
    }catch(err){
        console.log(err)
    }
}

main();