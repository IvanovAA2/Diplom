
class Code
{
    text = "";    
}

class Operation
{
    static DEFAULT_FUNCTIONS = [
        "print",
        "println",
        "await",
        "input",
        "format",
        "clone",
        "rand",
        "clock",

        "is_null",
        "is_bool",
        "is_number",
        "is_string",
        "is_array",
        "is_object",
        "is_function",
    ];
    static DEFAULT_METHODS = [];
}
for (const INDEX in Operation.OPERATIONS)
{
    Operation.TYPEOF[Operation.OPERATIONS[INDEX]] = INDEX;
}
Operation.DEFAULT_METHODS[Data.TYPEOF.string] = new Set([
    "size",
    "split",
    "codeOfChar",
]);
Operation.DEFAULT_METHODS[Data.TYPEOF.array] = new Set([
    "size",
    "push",
    "pop",
    "join",
]);

class Scope
{
    parent;
    symbol_table;

    constructor (parent)
    {
        this.parent = parent;
        this.symbol_table = new Map();
    }
}

class Visitor
{
    static VISIT_RULE = {}
    
    scope_tree     = [new Scope(-1)];
    current_scope  = 0;
    
    code;

    constructor (code)
    {
        this.code = code;
    }

    visit (parent, arg, child)
    {
        const NODE = parent.children[child - 1];

        if (Visitor.VISIT_RULE.hasOwnProperty(NODE.rule_name))
        {
            // DEBUG
            
            // console.log(`${NODE.rule_name}`) 
            
            // DEBUG
            return Visitor.VISIT_RULE[NODE.rule_name](this, NODE, arg);
        }
        else
        {
            console.log(`terminal rulename: ${NODE.rule_name}`);
            
            this.addText(NODE.children.string);
        }
    }
    visit_all (parent, arg)
    {
        for (const NODE of parent.children)
        {
            if (Visitor.VISIT_RULE.hasOwnProperty(NODE.rule_name))
            {
                // DEBUG
                
                // console.log(`${NODE.rule_name}`) 
                
                // DEBUG
                return Visitor.VISIT_RULE[NODE.rule_name](this, NODE, arg);
            }
            else
            {
                console.log(`terminal rulename: ${NODE.rule_name}`);
            
                this.addText(NODE.children.string);
            }
        }
    }
    
    addText (text)
    {
        this.code.text += text;
    }
}



Visitor.VISIT_RULE["Program"] = 
function (visitor, node, arg)
{
    if (length_is(node, 2))
    {
        visitor.visit(node, 0, 1);
    }
}
Visitor.VISIT_RULE["Statements"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["Statement"] = 
function (visitor, node, arg)
{
    visitor.addText("    ".repeat(arg));
    
    visitor.visit_all(node, arg);
    
    visitor.addText("\n");
}
Visitor.VISIT_RULE["Scope"] = 
function (visitor, node, arg)
{
    visitor.addText("    ".repeat(arg));
    visitor.visit(node, arg, 1);
    visitor.addText("\n");
    
    visitor.visit(node, arg + 1, 2);
    
    visitor.addText("    ".repeat(arg));
    visitor.visit(node, arg, 3);
    visitor.addText("\n");
}

Visitor.VISIT_RULE["Class"] = 
function (visitor, node, arg)
{
    visitor.visit(node, arg, 1);
    visitor.visit(node, arg, 2);
    visitor.addText("\n");
    
    visitor.addText("    ".repeat(arg));
    visitor.visit(node, arg, 3);
    visitor.addText("\n");
    
    visitor.visit(node, arg + 1, 4);
    
    visitor.addText("    ".repeat(arg));
    visitor.visit(node, arg, 5);
    visitor.addText("\n");
}
Visitor.VISIT_RULE["ClassStatements"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["ClassStatement"] = 
function (visitor, node, arg)
{
    visitor.addText("    ".repeat(arg));
    
    visitor.visit(node, arg, 1);
    
    visitor.addText("\n");
}
Visitor.VISIT_RULE["Constructor"] = 
function (visitor, node, arg)
{
    visitor.visit(node, arg, 1);
    visitor.visit(node, arg, 2);
    visitor.visit(node, arg, 3);
    visitor.visit(node, arg, 4);
    visitor.addText("\n");
    
    visitor.visit(node, arg, 5);
}
Visitor.VISIT_RULE["ClassMember"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["$ClassMember"] = 
function (visitor, node, arg)
{
    visitor.visit(node, arg, 1);
}
Visitor.VISIT_RULE["ClassField"] = 
function (visitor, node, arg)
{
    if (length_is(node, 3))
    {
        visitor.visit_all(node, arg);
    }
    else
    {
        visitor.addText("=null;");
    }
}
Visitor.VISIT_RULE["ClassMethod"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}

Visitor.VISIT_RULE["Function"] = 
function (visitor, node, arg)
{
    visitor.addText("function ");
    
    visitor.visit(node, arg, 2);
    visitor.addText(" ");
    visitor.visit(node, arg, 3);
    visitor.visit(node, arg, 4);
    visitor.visit(node, arg, 5);
    visitor.addText("\n");
    visitor.visit(node, arg, 6);
}
Visitor.VISIT_RULE["FunctionParameters"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["$FunctionParameters"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["FunctionParameter"] = 
function (visitor, node, arg)
{
    visitor.visit(node, arg, 1);
    
    if (length_is(node, 1))
    {
        visitor.addText("=null")
    }
    if (length_is(node, 2))
    {
        visitor.visit(node, arg, 2);
    }
}
Visitor.VISIT_RULE["$FunctionParameter"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}

Visitor.VISIT_RULE["BoolExpression"] = 
function (visitor, node, arg)
{
    visitor.addText("$to_bool(");
    visitor.visit(node, arg, 1);
    visitor.addText(")");
}

Visitor.VISIT_RULE["Conditional"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["ElseBlock"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}

Visitor.VISIT_RULE["Loop"] = 
function (visitor, node, arg)
{
    visitor.visit(node, arg, 1);
}
Visitor.VISIT_RULE["While"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["For"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["ExpressionOrDeclaration"] = 
function (visitor, node, arg)
{
    visitor.visit(node, arg, 1);
}
Visitor.VISIT_RULE["FlowControl"] = 
function (visitor, node, arg)
{
    const NAME = name_of(node, 1);

    switch (NAME)
    {
        case "continue":
        {
            visitor.addText("continue;")
        }
        break;
        case "break":
        {
            visitor.addText("break;")
        }
        break;
        case "return":
        {
            if (length_is(node, 3))
            {
                visitor.addText("continue")
                visitor.visit(node, arg, 2);
                visitor.addText(";")
            }
            if (length_is(node, 2))
            {
                visitor.visit(node, arg, 1);
            }
        }
        break;
    }
}

Visitor.VISIT_RULE["Declaration"] = 
function (visitor, node, arg)
{
    visitor.addText("let ")
    visitor.visit(node, arg, 2);

    if (length_is(node, 3))
    {
        visitor.visit(node, arg, 3);
    }
}
Visitor.VISIT_RULE["$Declaration"] =
function (visitor, node, arg)
{
    visitor.addText(",")
    visitor.visit(node, arg, 2);

    if (length_is(node, 3))
    {
        visitor.visit(node, arg, 3);
    }
}
Visitor.VISIT_RULE["SingleDeclaration"] = 
function (visitor, node, arg)
{
    visitor.visit(node, arg, 1);

    if (length_is(node, 1))
    {
        visitor.addText("=null")
    }
    if (length_is(node, 2))
    {
        visitor.visit(node, arg, 2);
    }
}
Visitor.VISIT_RULE["$SingleDeclaration"] =
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}

Visitor.VISIT_RULE["Expressions"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["$Expressions"] =
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["Expression"] = 
function (visitor, node, arg)
{
    visitor.visit(node, arg, 1);
}
Visitor.VISIT_RULE["$Expression"] =
function (visitor, node, arg)
{
    visitor.visit(node, arg, 1);
}

Visitor.VISIT_RULE["AssignOp"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["$AssignOp"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}

Visitor.VISIT_RULE["BoolOr"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["$BoolOr"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["BoolAnd"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["$BoolAnd"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}

Visitor.VISIT_RULE["BitOr"] = 
function (visitor, node, arg)
{
    const LEFT = visitor.visit(node, arg, 1);

    if (length_is(node, 1))
    {
        return LEFT;
    }

    return visitor.visit(node, LEFT, 2);
}
Visitor.VISIT_RULE["$BitOr"] =
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["BitXor"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["$BitXor"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["BitAnd"] = 
function (visitor, node, arg)
{
    const LEFT = visitor.visit(node, arg, 1);

    if (length_is(node, 1))
    {
        return LEFT;
    }

    return visitor.visit(node, LEFT, 2);
}
Visitor.VISIT_RULE["$BitAnd"] =
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}

Visitor.VISIT_RULE["EqualOp"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["$EqualOp"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}

Visitor.VISIT_RULE["CompOp"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["$CompOp"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}

Visitor.VISIT_RULE["AddOp"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["$AddOp"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}

Visitor.VISIT_RULE["MulOp"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["$MulOp"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}

Visitor.VISIT_RULE["UnaryOp"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}

Visitor.VISIT_RULE["Accessing"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["$Accessing"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["SingleAccessing"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["SubscriptOrSlice"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["Slice"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["MemberAccessing"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}

Visitor.VISIT_RULE["Value"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}

Visitor.VISIT_RULE["NewObject"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["This"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}

Visitor.VISIT_RULE["Variable"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["id"] = 
function (visitor, node, arg)
{
    visitor.addText(node.children.string);
}

Visitor.VISIT_RULE["FunctionCall"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}

Visitor.VISIT_RULE["Null"] = 
function (visitor, node, arg)
{
    return create_value(visitor, Data.TYPEOF.null, null);
}
Visitor.VISIT_RULE["Boolean"] = 
function (visitor, node, arg)
{
    if (length_is(node, 1))
    {
        return visitor.visit(node, arg, 1); 
    }

    const RESULT    = create_position(visitor);
    const VALUE     = visitor.visit(node, arg, 3); 

    create_operation(
        visitor, 
        get_operation("to_bool"), 
        [RESULT, VALUE], 
        get_position(node, 1)
    );

    return RESULT;
}
Visitor.VISIT_RULE["true"] = 
function (visitor, node, arg)
{
    return create_value(visitor, Data.TYPEOF.bool, true);
}
Visitor.VISIT_RULE["false"] = 
function (visitor, node, arg)
{
    return create_value(visitor, Data.TYPEOF.bool, false);
}
Visitor.VISIT_RULE["Number"] = 
function (visitor, node, arg)
{
    if (length_is(node, 1))
    {
        return visitor.visit(node, arg, 1); 
    }
    
    const RESULT    = create_position(visitor);
    const VALUE     = visitor.visit(node, arg, 3); 

    create_operation(
        visitor, 
        get_operation("to_number"), 
        [RESULT, VALUE], 
        get_position(node, 1)
    );

    return RESULT;
}
Visitor.VISIT_RULE["number_token"] = 
function (visitor, node, arg)
{
    return create_value(visitor, Data.TYPEOF.number, Number(node.children.string));
}
Visitor.VISIT_RULE["String"] = 
function (visitor, node, arg)
{
    if (length_is(node, 1))
    {
        return visitor.visit(node, arg, 1); 
    }
    
    const RESULT    = create_position(visitor);
    const VALUE     = visitor.visit(node, arg, 3); 
    
    create_operation(
        visitor, 
        get_operation("to_string"), 
        [RESULT, VALUE], 
        get_position(node, 1)
    );

    return RESULT;
}
Visitor.VISIT_RULE["string_token"] = 
function (visitor, node, arg)
{
    return create_value(visitor, Data.TYPEOF.string, node.children.string);
}
Visitor.VISIT_RULE["Array"] = 
function (visitor, node, arg)
{
    const ARRAY = [];

    if (length_is(node, 3))
    {
        visitor.visit(node, ARRAY, 2);
    }

    return create_value(visitor, Data.TYPEOF.array, ARRAY);
}
Visitor.VISIT_RULE["$Array"] = 
function (visitor, node, arg)
{
    const ARRAY = arg;
    ARRAY.push(visitor.visit(node, arg, 1));

    if (length_is(node, 2))
    {
        visitor.visit(node, ARRAY, 2);
    }
}
Visitor.VISIT_RULE["$$Array"] = 
function (visitor, node, arg)
{
    const ARRAY = arg;
    ARRAY.push(visitor.visit(node, arg, 2));

    if (length_is(node, 3))
    {
        visitor.visit(node, ARRAY, 3);
    }
}



function length_is (node, length)
{
    return length === node.children.length;
}
function name_of (node, child)
{
    return node.children[child - 1].rule_name;
}

function get_position (node, child)
{
    return node.children[child - 1].children.position;
}

function get_operation (node, child = null)
{
    let name = node;
    if (child !== null)
    {
        name = node.children[child - 1].children.type;
    }
    
    if (Operation.TYPEOF.hasOwnProperty(name) === false)
    {
        throw new Error(`no operation named ${name}`);
    }

    // CHANGE
    return Operation.OPERATION[Operation.TYPEOF[name]];
    // return Operation.TYPEOF[name];
}

function open_function (visitor)
{
    const FUNCTION_ID = visitor.function_memory.length;

    visitor.function_stack.push(FUNCTION_ID);
    visitor.function_memory[FUNCTION_ID] = 0;
    
    return FUNCTION_ID;
}
function close_function (visitor)
{
    create_operation(
        visitor, 
        get_operation("return"), 
        [
            create_value(
                visitor, 
                Data.TYPEOF.null, 
                null
            )
        ],
        null
    );

    visitor.function_stack.pop();
}
function current_function (visitor)
{
    return visitor.function_stack.at(-1);
}

function create_position (visitor)
{
    const CURRENT_FUNCTION  = visitor.function_stack.at(-1);
    const FUNCTION_MEMORY   = visitor.function_memory[CURRENT_FUNCTION];
    const POSITION          = [CURRENT_FUNCTION, FUNCTION_MEMORY];

    visitor.function_memory[CURRENT_FUNCTION] += 1;

    return new Data(Data.TYPEOF.ref, POSITION);
}
function create_value (visitor, type, data)
{
    const CURRENT_FUNCTION  = visitor.function_stack.at(-1);
    const FUNCTION_MEMORY   = visitor.function_memory[CURRENT_FUNCTION];
    const POSITION          = [CURRENT_FUNCTION, FUNCTION_MEMORY];

    visitor.function_memory[CURRENT_FUNCTION] += 1;

    create_operation(
        visitor, 
        get_operation("create"), 
        [
            new Data(
                Data.TYPEOF.ref,
                POSITION
            ), 
            type, 
            data
        ], 
        null
    );

    return new Data(Data.TYPEOF.ref, POSITION);
}
function copy_value (visitor, type, data)
{
    const CURRENT_FUNCTION  = visitor.function_stack.at(-1);
    const FUNCTION_MEMORY   = visitor.function_memory[CURRENT_FUNCTION];
    const POSITION          = [CURRENT_FUNCTION, FUNCTION_MEMORY];

    visitor.function_memory[CURRENT_FUNCTION] += 1;

    create_operation(
        visitor, 
        get_operation("copy"), 
        [
            new Data(
                Data.TYPEOF.ref,
                POSITION
            ), 
            type, 
            data
        ], 
        null
    );

    return new Data(Data.TYPEOF.ref, POSITION);
}
function $create_value (visitor, type, data)
{
    const CURRENT_FUNCTION  = visitor.function_stack.at(-1);
    const FUNCTION_MEMORY   = visitor.function_memory[CURRENT_FUNCTION];
    const POSITION          = [CURRENT_FUNCTION, FUNCTION_MEMORY];

    visitor.function_memory[CURRENT_FUNCTION] += 1;

    const OPERATION = create_operation(
        visitor, 
        get_operation("create"), 
        [
            new Data(
                Data.TYPEOF.ref,
                POSITION
            ), 
            type, 
            data
        ], 
        null
    );

    return {
        VALUE       : new Data(Data.TYPEOF.ref, POSITION), 
        OPERATION   : OPERATION
    };
}

function create_operation (visitor, type, operands, position)
{
    visitor.operations.push(new Operation(type, operands, position));

    return visitor.operations.length - 1;
}
function current_operation (visitor)
{
    return visitor.operations.length - 1;
}
function next_operation (visitor)
{
    return visitor.operations.length;
}

function create_identifier (visitor, name)
{
    const SYMBOL_TABLE = visitor.scope_tree[visitor.current_scope].symbol_table;

    if (SYMBOL_TABLE.has(name) == false)
    {
        SYMBOL_TABLE.set(name, create_position(visitor));
    }
    
    return SYMBOL_TABLE.get(name);
}
function get_identifier (visitor, name, position)
{
    let scope = visitor.current_scope;

    while (visitor.scope_tree[scope].symbol_table.has(name) === false) 
    {
        scope = visitor.scope_tree[scope].parent;

        if (scope === -1) 
        {
            throw new Error(`undeclared identifier "${name}" at (${position.row}, ${position.column})`);
        }
    }

    return visitor.scope_tree[scope].symbol_table.get(name);
}

function branch_scope (visitor)
{
    const PREVIOUS_SCOPE = visitor.current_scope;
    visitor.current_scope = visitor.scope_tree.length;

    visitor.scope_tree.push(new Scope(PREVIOUS_SCOPE));
}
function leave_scope (visitor)
{
    visitor.current_scope = visitor.scope_tree[visitor.current_scope].parent;
}