var ID = require(__dirname + '/../lib/id.js');

var b = {bad: 'I have no name!!!'};
var p = {name: 'My_Product'};
var r = {name: 'My_Release'};
var e = {name: 'My_Event'};
var cc = {name: 'My_CodeChange'};
var s = {name: 'My_Service'};
var si = {key: 'My_Service_Instance'};
var n = {name: 'My_Node'};

var pesimistic_test = function(func_str) {
  var fail = true;
  try {
    eval(func_str);
  } catch(err) {
    fail = false;
    console.log("Expected Error ["+func_str+"]: " + err);
  }
  if (fail) throw "Failed to fail as expected with ["+func_str+"]";
};

console.log(ID.Product(p));
pesimistic_test("console.log(ID.Product(b))");
pesimistic_test("console.log(ID.Product())");

console.log(ID.Release(p, r));
pesimistic_test("console.log(ID.Release(p, b))");
pesimistic_test("console.log(ID.Release(p))");
pesimistic_test("console.log(ID.Release(b))");
pesimistic_test("console.log(ID.Release())");

console.log(ID.Event(p, r, e));
pesimistic_test("console.log(ID.Event(p, r, b))");
pesimistic_test("console.log(ID.Event(p, r))");
pesimistic_test("console.log(ID.Event(p, b))");
pesimistic_test("console.log(ID.Event(p))");
pesimistic_test("console.log(ID.Event(b))");
pesimistic_test("console.log(ID.Event())");

console.log(ID.CodeChange(p, r, cc));
pesimistic_test("console.log(ID.CodeChange(p, r, b))");
pesimistic_test("console.log(ID.CodeChange(p, r))");
pesimistic_test("console.log(ID.CodeChange(p, b))");
pesimistic_test("console.log(ID.CodeChange(p))");
pesimistic_test("console.log(ID.CodeChange(b))");
pesimistic_test("console.log(ID.CodeChange())");

console.log(ID.Service(p, s));
pesimistic_test("console.log(ID.Service(p, b))");
pesimistic_test("console.log(ID.Service(p))");
pesimistic_test("console.log(ID.Service(b))");
pesimistic_test("console.log(ID.Service())");

console.log(ID.ServiceInstance(si));
pesimistic_test("console.log(ID.ServiceInstance(b))");
pesimistic_test("console.log(ID.ServiceInstance())");

console.log(ID.Node(n));
pesimistic_test("console.log(ID.Node(b))");
pesimistic_test("console.log(ID.Node())");
