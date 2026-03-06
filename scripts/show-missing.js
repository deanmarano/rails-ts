const j=JSON.parse(require('fs').readFileSync('scripts/test-compare/output/rails-tests.json','utf8'));
const ts=JSON.parse(require('fs').readFileSync('scripts/test-compare/output/ts-tests.json','utf8'));
const ar=j.packages.activerecord.files;
const rubyTests=[];
ar.forEach(f=>f.testCases.forEach(t=>rubyTests.push({file:f.file,path:t.path})));
const tsPaths=new Set();
ts.packages.activerecord.files.forEach(f=>f.testCases.forEach(t=>tsPaths.add(t.path)));
const missing={};
rubyTests.forEach(t=>{
  if(!tsPaths.has(t.path)){
    missing[t.file]=missing[t.file]||[];
    missing[t.file].push(t.path);
  }
});
const files=['relations_test.rb','finder_test.rb','base_test.rb','persistence_test.rb','calculations_test.rb','enum_test.rb','transactions_test.rb','attribute_methods_test.rb','scoping/default_scoping_test.rb','scoping/named_scoping_test.rb','inheritance_test.rb','insert_all_test.rb','batches_test.rb','associations/belongs_to_associations_test.rb','associations/has_many_associations_test.rb','callbacks_test.rb','validations_test.rb','serialization_test.rb','attributes_test.rb','sanitize_test.rb','store_test.rb','readonly_test.rb','secure_token_test.rb','integration/eager_loading_test.rb','adapters/sqlite3/sqlite3_adapter_test.rb','adapter_test.rb'];
files.forEach(f=>{
  if(missing[f]){
    console.log('---',f,'('+missing[f].length+' missing)');
    missing[f].forEach(p=>console.log('  '+p));
  }
});
