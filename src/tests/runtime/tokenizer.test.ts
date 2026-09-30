import {it,expect} from 'vitest';
import {tokenize} from '../../simulator/runtime/tokenizer/Tokenizer';
it('recognizes tokens, comments, strings, operators and source locations',()=>{
 const tokens=tokenize('#include <KnightRoboticsLibs_Iroh.h>\n// comentario\nint contador=10; /* bloque */\nbool ok=true; contador+=2; "IR IZQUIERDO"; 3.5; != && || ++ --');
 expect(tokens[0]).toMatchObject({kind:'keyword',text:'int',loc:{startLine:3,startColumn:1,endColumn:4}});
 expect(tokens.find(t=>t.text==='IR IZQUIERDO')?.kind).toBe('string');expect(tokens.find(t=>t.text==='3.5')?.kind).toBe('number');expect(tokens.map(t=>t.text)).toEqual(expect.arrayContaining(['+=','!=','&&','||','++','--']));
});
it.each(['#include <WiFi.h>','#define X 1','"sin cierre','/* sin cierre','@'])('rejects unsupported or unterminated input %s',source=>expect(()=>tokenize(source)).toThrow());
