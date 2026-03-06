const j=JSON.parse(require('fs').readFileSync('scripts/test-compare/output/rails-tests.json','utf8'));
const ts=JSON.parse(require('fs').readFileSync('scripts/test-compare/output/ts-tests.json','utf8'));
const ar=j.packages.activerecord.files;
const tsPaths=new Set();
ts.packages.activerecord.files.forEach(f=>f.testCases.forEach(t=>tsPaths.add(t.path)));
const missing={};
ar.forEach(f=>f.testCases.forEach(t=>{
  if(tsPaths.has(t.path)) return;
  missing[t.file]=missing[t.file]||[];
  missing[t.file].push(t.path);
}));
const targets=['base_test.rb','calculations_test.rb','enum_test.rb','attribute_methods_test.rb','scoping/default_scoping_test.rb','scoping/named_scoping_test.rb','callbacks_test.rb','validations_test.rb','serialization_test.rb','attributes_test.rb','sanitize_test.rb','readonly_test.rb','secure_token_test.rb','transactions_test.rb','batches_test.rb','inheritance_test.rb','insert_all_test.rb','store_test.rb','associations_test.rb','persistence_test.rb','finder_test.rb','relations_test.rb'];
targets.forEach(f=>{
  if(missing[f]){
    console.log('---',f,'('+missing[f].length+')');
    missing[f].forEach(p=>console.log('  '+p));
  }
});
