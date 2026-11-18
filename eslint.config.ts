import js from '@eslint/js';
import tseslint from 'typescript-eslint';
export default tseslint.config(
 {ignores:['node_modules/**','.next/**','test-results/**','playwright-report/**','output/**']},
 js.configs.recommended,
 ...tseslint.configs.recommended,
 {files:['**/*.ts','**/*.tsx'],rules:{'@typescript-eslint/no-explicit-any':'error','@typescript-eslint/no-unused-vars':['error',{argsIgnorePattern:'^_',varsIgnorePattern:'^_',caughtErrors:'none',ignoreRestSiblings:true}]}},
);
