
class Object
{
    // symbol_type;
    type;
    data; 

    static typeof =
    {
        // variable    : 0,
        // function    : 1,
        // value       : 2,

        null    : 0,
        bool    : 1,
        number  : 2,
        string  : 3,
        array   : 4,

        arac    : 5,
    }

    static data_name = new Map
    ([
        [0, "null"],
        [1, "bool"],
        [2, "number"],
        [3, "string"],
        [4, "array"],
        [5, "arac"],
    ])

    // static symbol_name = new Map
    // ([
    //     [0, "var-l"],
    //     [1, "fun-n"],
    //     [2, "value"],
    // ])

    constructor (type, data)
    {
        this.type   = type;
        this.data   = data;
    }
}

class Operation
{
    type;
    operands;
    position;

    constructor (type, operands, position)
    {
        this.type       = type;
        this.operands   = operands;
        this.position   = position;
    }
}

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

class Program
{
    #parse_tree;

    #data               = [];
    #operations         = [];
    #current_operation  = 0;
    #scope_tree         = [new Scope(-1)];
    #current_scope      = 0;
    #return_jumps       = [];

    #time_start         = null;
    overall_time       = 0;

    constructor (parse_tree) 
    {
        this.#parse_tree = parse_tree;

        this.#generate_program();
    }

    #visitor (node, arg = null)
    {
        switch (node.rule_name)
        {
            // just branching
            case "Program" :
            case "Statements" :
            case "Expressions" :
            case "$Expressions" :
            {
                this.#visit_children(node);
            }
            break;

            // "{" "Statements" "}"
            case "Scope":
            {
                this.#branch_scope();

                this.#visitor(node.children[1]);

                this.#leave_scope();
            }
            break;

            case "While":
            {
                const begin             = this.#operations.length - 1;
                const bool_expression   = this.#create_value(Object.typeof.null, null);
                const position          = node.children[0].children.position;

                this.#branch_scope();
                
                this.#create_operation("bool", [bool_expression, this.#visitor(node.children[2])], position);
                const operation = this.#operations.length;
                this.#create_operation("if", [null, bool_expression], position);

                const to_end = this.#visitor(node.children[4], [begin, [operation]])[1];

                const end = this.#operations.length;
                for (const op_pos of to_end)
                {
                    this.#operations[op_pos].operands[0] = end; 
                }

                this.#create_operation("jump", [begin], position);

                this.#leave_scope();
            }
            break;
            case "For":
            {
                const position = node.children[0].children.position;

                this.#branch_scope();

                this.#visitor(node.children[2]);

                const begin             = this.#operations.length - 1;
                const bool_expression   = this.#create_value(Object.typeof.null, null);
                
                this.#create_operation("bool", [bool_expression, this.#visitor(node.children[4])], position);
                const operation = this.#operations.length;
                this.#create_operation("if", [null, bool_expression], position);

                const to_end = this.#visitor(node.children[8], [begin, [operation]])[1];

                this.#visitor(node.children[6]);

                const end = this.#operations.length;
                for (const op_pos of to_end)
                {
                    this.#operations[op_pos].operands[0] = end; 
                }

                this.#create_operation("jump", [begin], position);

                this.#leave_scope();
            }
            break;

            case "LoopScope":
            {
                if (node.children.length === 3)
                {
                    if (node.children[1].rule_name === "LoopStatement" ||
                        node.children[1].rule_name === "LoopStatements" 
                    )
                    {
                        this.#visitor(node.children[1], arg)
                    }
                    else
                    {
                        this.#visitor(node.children[1]);
                    }
                }
                return arg;
            }
            case "LoopStatements":
            {
                if (node.children[0].rule_name === "LoopStatement" ||
                    node.children[0].rule_name === "LoopScope"
                )
                {
                    this.#visitor(node.children[0], arg)
                    this.#visitor(node.children[1], arg);
                }
                else
                {
                    this.#visitor(node.children[0]);
                    this.#visitor(node.children[1], arg);
                }
            }
            break;
            case "LoopStatement":
            {
                const position = node.children[0].children.position;

                if (node.children[0].rule_name === "break")
                {
                    arg[1].push(this.#operations.length);

                    this.#create_operation("jump", [null], position);
                }
                if (node.children[0].rule_name === "continue")
                {
                    this.#create_operation("jump", [arg[0]], position);
                }
            }
            break;

            case "ForDeclaration":
            {
                if (node.children[1].rule_name === "id") 
                {
                    const variable_name = node.children[1].children.string;
                    const position      = node.children[1].children.position;

                    this.#create_variable(variable_name, this.#create_value(Object.typeof.null, null), position);
                }
                else 
                {
                    this.#visitor(node.children[1]);
                }
            }
            break;
            case "Declaration" :
            case "$Declaration" : // "," "SingleDeclaration" "$Declaration"
            {
                if (node.children[1].rule_name === "id") 
                {
                    const variable_name = node.children[1].children.string;
                    const position      = node.children[1].children.position;

                    this.#create_variable(variable_name, this.#create_value(Object.typeof.null, null), position);
                }
                else 
                {
                    this.#visitor(node.children[1]);
                }

                this.#visitor(node.children[2]);
            }
            break;
            case "SingleDeclaration" :
            {
                const variable_name = node.children[0].children.string;
                const position      = node.children[0].children.position;

                this.#create_variable(variable_name, this.#visitor(node.children[1]), position);
            }
            break;
            case "$SingleDeclaration" :
            {
                return this.#visitor(node.children[1]);
            }

            // pass left operand to pair of operation and right operand
            case "AssignOp":
            case "BoolOr":
            case "BoolAnd":
            case "BitOr":
            case "BitXor":
            case "BitAnd":
            case "EqualOp":
            case "CompOp":
            case "AddOp":
            case "MulOp":
            {
                return this.#visitor(node.children[1], this.#visitor(node.children[0]));
            }

            // operations
            case "$AssignOp":
            {
                const operation_type    = node.children[0].children.type;
                const position          = node.children[0].children.position;

                this.#create_operation(operation_type, [arg, this.#visitor(node.children[1])], position);
                        
                return arg;
            }

            case "$BoolOr":
            case "$BoolAnd":
            case "$EqualOp":
            case "$CompOp":
            case "$AddOp":
            case "$MulOp":
            {
                const operation_type    = node.children[0].children.type;
                const destination       = this.#create_value(Object.typeof.null, null);
                const position          = node.children[0].children.position;
                
                this.#create_operation(operation_type, [destination, arg, this.#visitor(node.children[1])], position);

                return destination;
            }

            case "$Value":
            {
                return this.#visitor(node.children[1], this.#visitor(node.children[0]));
            }
            case "Value":
            {
                if (node.children.length === 3) // "(" Expression ")"
                {
                    return this.#visitor(node.children[1]);
                }

                return this.#visitor(node.children[1], this.#visitor(node.children[0]));
            }
            case "Accessing":
            {
                if (node.children[0].rule_name === ".")
                {
                    return this.#visitor(node.children[1], arg);
                }
                else if (node.children[2].rule_name === "]")
                {
                    const array = arg;
                    const index = this.#visitor(node.children[1]);

                    const destination = this.#create_value(Object.typeof.arac, [array, [index]]);

                    if (node.children.length === 4) // "[" "Expression" "]" "Accessing"
                    {
                        this.#visitor(node.children[3], destination);
                    }

                    return destination;
                }
                else
                {
                    const destination = this.#create_value(Object.typeof.null, null);

                    this.#create_operation(
                    "slice", 
                    [
                        destination, 
                        arg, 
                        this.#visitor(node.children[1]), 
                        this.#visitor(node.children[2])
                    ], 
                    node.children[0].children.position
                    );

                    if (node.children.length === 5) // "[" "Expression", "Slice" "]" "Accessing"
                    {
                        return this.#visitor(node.children[4], destination);
                    }
                    if (node.children.length === 4) // "[" "Expression", "Slice" "]"
                    {
                        return destination;
                    }
                }
            }
            break;
            case "MemberAccess":
            {
                switch (node.children[0].rule_name)
                {
                    case "len":
                    {
                        const destination   = this.#create_value(Object.typeof.null, null);
                        const position      = node.children[0].children.position;

                        this.#create_operation("len", [destination, arg], position);

                        return destination;
                    }
                }
            }
            case "$Accessing":
            {
                if (node.children[2].rule_name === "]")
                {
                    const index = this.#visitor(node.children[1]);

                    this.#data[arg].data[1].push(index);

                    if (node.children.length === 4) // "[" "Expression" "]" "Accessing"
                    {
                        this.#visitor(node.children[3], arg);
                    }
                }
                else
                {
                    const destination = this.#create_value(Object.typeof.null, null);

                    this.#create_operation(
                    "slice", 
                    [
                        destination, 
                        arg, 
                        this.#visitor(node.children[1]), 
                        this.#visitor(node.children[2])
                    ], 
                    node.children[0].children.position
                    );

                    if (node.children.length === 5) // "[" "Expression", "Slice" "]" "Accessing"
                    {
                        return this.#visitor(node.children[4], destination);
                    }
                    if (node.children.length === 4) // "[" "Expression", "Slice" "]"
                    {
                        return destination;
                    }
                }
            }
            break;
            case "Slice":
            {
                return this.#visitor(node.children[1]);
            }

            case "null":
            {
                return this.#create_value(Object.typeof.null, null);
            }
            case "true":
            {
                return this.#create_value(Object.typeof.bool, true);
            }
            case "false":
            {
                return this.#create_value(Object.typeof.bool, false);
            }
            case "numberToken":
            {
                return this.#create_value(Object.typeof.number, Number(node.children.string));
            }
            case "stringToken":
            {
                return this.#create_value(Object.typeof.string, node.children.string);
            }
            case "Array":
            {
                if (node.children.length === 2) // "[" "]"
                {
                    return this.#create_value(Object.typeof.array, []);
                }
                // "[" "$Array" "]"
                if (node.children[1].rule_name === "$Array")
                {
                    const reference = this.#create_value(Object.typeof.array, this.#visitor(node.children[1]));
                    const array     = this.#create_value(Object.typeof.array, []);

                    this.#create_operation("build", [array, reference], null);

                    return array;
                }

                const reference = this.#create_value(Object.typeof.array, [this.#visitor(node.children[1])]);
                const array     = this.#create_value(Object.typeof.array, []);

                this.#create_operation("build", [array, reference], null);

                return array;
            }
            case "$Array":
            {
                var array = [this.#visitor(node.children[0])];

                if (node.children.length === 2)
                {
                    this.#visitor(node.children[1], array);
                }

                return array;
            }
            case "$$Array":
            {
                arg.push(this.#visitor(node.children[1]));

                if (node.children.length === 3)
                {
                    this.#visitor(node.children[2], arg); 
                }
            }
            break;

            case "Boolean":
            {
                const destination   = this.#create_value(Object.typeof.null, null);
                const position      = node.children[0].children.position;
                
                this.#create_operation("bool", [destination, this.#visitor(node.children[2])], position);

                return destination;
            }
            case "Number":
            {
                const destination       = this.#create_value(Object.typeof.null, null);
                const position          = node.children[0].children.position;
                
                this.#create_operation("num", [destination, this.#visitor(node.children[2])], position);

                return destination;
            }
            case "String":
            {
                const destination       = this.#create_value(Object.typeof.null, null);
                const position          = node.children[0].children.position;
                
                this.#create_operation("str", [destination, this.#visitor(node.children[2])], position);

                return destination;
            }

            case "id":
            {
                const id_name   = node.children.string;
                const position  = node.children.position;

                return this.#get_id(id_name, position);
            }

            case "Conditional":
            {
                arg = this.#visitor(node.children[0], true);

                if (node.children[1].rule_name !== "$ElifBlock")
                {
                    arg[1] = true;
                }

                this.#visitor(node.children[1], arg);
            }
            break;
            case "IfBlock":
            {
                const bool_expression   = this.#create_value(Object.typeof.null, null);
                const position          = node.children[0].children.position;
                
                this.#create_operation("bool", [bool_expression, this.#visitor(node.children[2])], position);
                const operation = this.#operations.length;
                this.#create_operation("if", [null, bool_expression], position);

                this.#visitor(node.children[4]);

                const jump_to_end = this.#operations.length;

                this.#operations[operation].operands[0] = this.#operations.length;
                this.#create_operation("jump", [jump_to_end], position);

                if (arg === true)
                {
                    return [[jump_to_end], false];
                }
            }
            break;
            case "$ElifBlock":
            {
                arg = this.#visitor(node.children[0], arg);

                if (node.children[1].rule_name !== "$ElifBlock")
                {
                    arg[1] = true;
                }

                this.#visitor(node.children[1], arg);  
            }
            break;
            case "ElifBlock":
            {
                const bool_expression   = this.#create_value(Object.typeof.null, null);
                const position          = node.children[0].children.position;
                
                this.#create_operation("bool", [bool_expression, this.#visitor(node.children[2])], position);
                const operation = this.#operations.length;
                this.#create_operation("if", [null, bool_expression], position);

                this.#visitor(node.children[4]);

                const jump_to_end = this.#operations.length;

                this.#operations[operation].operands[0] = this.#operations.length;
                this.#create_operation("jump", [jump_to_end], position);

                if (arg[1] === false)
                {
                    arg[0].push(jump_to_end);

                    return arg;
                }

                for (const operation of arg[0])
                {
                    this.#operations[operation].operands[0] = jump_to_end;
                }
            }
            break;
            case "ElseBlock":
            {
                this.#visitor(node.children[1]);

                const jump_to_end = this.#operations.length - 1;
                for (const operation of arg[0])
                {
                    this.#operations[operation].operands[0] = jump_to_end;
                }
            }
            break;

            case "FunctionCall":
            {
                const destination = this.#create_value(Object.typeof.null, null);
                // TODO
                return destination;
            }

            case "DefaultFunctionCall":
            {
                switch (node.children[0].rule_name)
                {
                    case "print":
                    {
                        const position  = node.children[0].children.position;
                        var parameters  = [];

                        if (node.children.length === 4)
                        {
                            if (node.children[2].rule_name === "Parameters")
                            {
                                this.#visitor(node.children[2], parameters);
                            }
                            else
                            {
                                parameters.push(this.#visitor(node.children[2]));
                            }
                        }

                        this.#create_operation("print", parameters, position);

                        return this.#create_value(Object.typeof.null, null);
                    }
                    case "input":
                    {
                        const position      = node.children[0].children.position;
                        const destination   = this.#create_value(Object.typeof.null, null);
                        var text            = -1;

                        if (node.children.length === 4) 
                        {
                            text = this.#visitor(node.children[2]);
                        }

                        this.#create_operation("await", [text], position);
                        this.#create_operation("input", [destination], position);

                        return destination;
                    }

                    case "isBool":
                    {
                        const destination   = this.#create_value(Object.typeof.null, null);
                        const object        = this.#visitor(node.children[2]);
                        const position      = node.children[0].children.position;

                        this.#create_operation("isb", [destination, object], position);

                        return destination;
                    }
                    case "isNumber":
                    {
                        const destination   = this.#create_value(Object.typeof.null, null);
                        const object        = this.#visitor(node.children[2]);
                        const position      = node.children[0].children.position;

                        this.#create_operation("isn", [destination, object], position);

                        return destination;
                    }
                    case "isString":
                    {
                        const destination   = this.#create_value(Object.typeof.null, null);
                        const object        = this.#visitor(node.children[2]);
                        const position      = node.children[0].children.position;

                        this.#create_operation("iss", [destination, object], position);

                        return destination;
                    }
                    case "isArray":
                    {
                        const destination   = this.#create_value(Object.typeof.null, null);
                        const object        = this.#visitor(node.children[2]);
                        const position      = node.children[0].children.position;

                        this.#create_operation("isa", [destination, object], position);

                        return destination;
                    }

                    case "len":
                    {
                        const destination   = this.#create_value(Object.typeof.null, null);
                        const object        = this.#visitor(node.children[2]);
                        const position      = node.children[0].children.position;

                        this.#create_operation("len", [destination, object], position);

                        return destination;
                    }
                }
            }

            case "Parameters":
            {
                arg.push(this.#visitor(node.children[0]));

                this.#visitor(node.children[1], arg);
            }
            break;
            case "$Parameters":
            {
                arg.push(this.#visitor(node.children[1]));

                if (node.children.length === 3)
                {
                    this.#visitor(node.children[2], arg);
                }
            }
            break;
        }
    }

    #generate_program ()
    {
        this.#visitor(this.#parse_tree);
    }

    #visit_children (node)
    {
        for (const child of node.children) 
        {
            this.#visitor(child);
        }
    }

    #create_value (type, data)
    {
        const destination = this.#data.length;

        this.#data.push(new Object(type, data));

        return destination;
    }

    #create_operation (type, operands, position)
    {
        this.#operations.push(new Operation(type, operands, position));
    }

    #create_variable (name, from, position)
    {
        if (this.#scope_tree[this.#current_scope].symbol_table.has(name))
        {
            throw new Error(`multiple initializations of "${name}" at (${position.row}, ${position.column})`);
        }

        const variable_position = this.#create_value(null, null);
        this.#create_operation("=", [variable_position, from], position);

        this.#scope_tree[this.#current_scope].symbol_table.set(name, variable_position);
    }

    #get_id (name, position)
    {
        var scope = this.#current_scope;

        while (this.#scope_tree[scope].symbol_table.has(name) === false) 
        {
            scope = this.#scope_tree[scope].parent;

            if (scope === -1) 
            {
                throw new Error(`uninitialized variable named "${name}" at (${position.row}, ${position.column})`);
            }
        }

        return this.#scope_tree[scope].symbol_table.get(name);
    }

    #branch_scope ()
    {
        const previous_scope = this.#current_scope;
        this.#current_scope = this.#scope_tree.length;

        this.#scope_tree.push(new Scope(previous_scope));
    }

    #leave_scope ()
    {
        this.#current_scope = this.#scope_tree[this.#current_scope].parent;
    }

    #get (index)
    {
        if (this.#data[index].type === Object.typeof.arac)
        {
            return this.#get_subscript(
                this.#data[this.#data[index].data[0]], 
                structuredClone(this.#data[index].data[1])
            );
        }

        return structuredClone(this.#data[index]);
    }

    #get_subscript (array, subscripts)
    {
        if (subscripts.length === 0)
        {
            return structuredClone(array);
        }

        const index = this.#get(subscripts.pop());

        if (array.type !== Object.typeof.array ||
            index.type !== Object.typeof.number
        )
        {
            this.#evoke_error();
        }
        
        return this.#get_subscript(array.data[index.data], subscripts);
    }

    #set (index, type, data)
    {
        if (this.#data[index].type === Object.typeof.arac)
        {
            this.#set_subscript(
                this.#data[this.#data[index].data[0]], 
                structuredClone(this.#data[index].data[1]),
                type, data
            );
        }

        this.#data[index].type = type;
        this.#data[index].data = data;
    }

    #set_subscript (array, subscripts, type, data)
    {
        if (subscripts.length === 0)
        {
            array.type = type;
            array.data = data;
        }
        else 
        {
            const index = this.#get(subscripts.pop());

            if (array.type !== Object.typeof.array ||
                index.type !== Object.typeof.number
            )
            {
                this.#evoke_error();
            }
            
            this.#get_subscript(array.data[index.data], subscripts, type, data);
        }
    }

    #evoke_error (from = 1, to = 1e9)
    {
        const current_operation = this.#operations[this.#current_operation];
        const operation_type    = current_operation.type;
        const operands          = current_operation.operands;
        const position          = current_operation.position;

        var message = `can't execute "${operation_type}" with [`;
        for (const index in operands)
        {
            if (index >= from + 1)
            {
                message += ", ";
            }
            if (index >= from) 
            {
                message += Object.data_name.get(this.#data[operands[index]].type);
            }
            if (index >= to)
            {
                break;
            }
        }
        message += `] at (${position.row}, ${position.column})`;

        throw new Error(message);
    }

    #print_data (comment = "")
    {
        console.log(comment);
        console.log(Array(15).join('-'));

        for(const x in this.#data)
        {
            console.log(`${x}: \t${Object.data_name.get(this.#data[x].type)}`);
            console.log(this.#data[x].data);
        }
    }

    #print (object)
    {
        switch (object.type)
        {
            case Object.typeof.null:
            {
                addOutput("null");
            }
            break;

            case Object.typeof.bool:
            case Object.typeof.number:
            case Object.typeof.string:
            {
                addOutput(String(object.data));   
            }
            break;

            case Object.typeof.array:
            {
                addOutput("[");

                for (const index in object.data)
                {
                    const element = object.data[index];
        
                    if (index > 0)
                    {
                        addOutput(", ");
                    }
        
                    this.#print(element);
                }
        
                addOutput("]");
            }
            break;

            default:
                console.log(`unknown type: ${object.type}, object ${object}`);
        }
    }

    async run () 
    {
        this.#time_start = performance.now();
        
        // DEBUG    
        
        // if (this.#current_operation === 0)
        // {
        //     console.log(this.#operations);
        //     this.#print_data();
        //     console.log(this.#data);
            
        //     this.#return_jumps = [];
        // }
        
        // DEBUG

        var end = false;
        
        while (this.#current_operation < this.#operations.length)
        {
            const current_operation     = this.#operations[this.#current_operation];
            const operation_type        = current_operation.type;
            const operands              = current_operation.operands.slice();
            const position              = current_operation.position;

            // DEBUG

            // console.log(operation_type, Array(8 - operation_type.length + 1).join(' '), operands);

            // await new Promise(r => setTimeout(r, 1000)); // -----------------------PAUSE--------------------------------

            // this.#print_data("-------------------------------------------------------------");
            
            // DEBUG

            switch (operation_type)
            {
                case "build":
                {
                    const array     = this.#data[operands[0]];
                    const reference = this.#data[operands[1]];

                    array.data = [];

                    for (const index of reference.data)
                    {
                        array.data.push(structuredClone(this.#data[index]));
                    }
                }
                break;

                case "if":
                {
                    const bool_expression = this.#get(operands[1]);

                    if (bool_expression.data === false)
                    {
                        this.#current_operation = operands[0];
                    }
                }
                break;
                case "jump":
                {
                    this.#current_operation = operands[0];
                }
                break;

                case "=":   
                {
                    const op = this.#get(operands[1]);

                    this.#set(operands[0], op.type, op.data);
                }
                break;
                case "+=":
                {
                    const op0 = this.#get(operands[0]);
                    const op1 = this.#get(operands[1]);

                    if (op0.type === Object.typeof.array &&
                        op1.type === Object.typeof.array 
                    )
                    {
                        var result = op0.data;
                        result.push(...op1.data);
                        
                        this.#set(operands[0], Object.typeof.array, result);

                        break;
                    }
                    if (op0.type === Object.typeof.null ||
                        op1.type === Object.typeof.null ||
                        op0.type === Object.typeof.array ||
                        op1.type === Object.typeof.array 
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#set(operands[0], Math.max(op0.type, op1.type), op0.data + op1.data);
                }
                break;
                case "-=":
                {
                    const op0 = this.#get(operands[0]);
                    const op1 = this.#get(operands[1]);

                    if (op0.type !== Object.typeof.bool &&
                        op0.type !== Object.typeof.number ||
                        op1.type !== Object.typeof.bool &&
                        op1.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#set(operands[0], Object.typeof.number, op0.data - op1.data);
                }
                break;
                case "*=":
                {
                    const op0 = this.#get(operands[0]);
                    const op1 = this.#get(operands[1]);

                    if (op1.type !== Object.typeof.number &&
                        op1.type !== Object.typeof.bool ||
                        op0.type === Object.typeof.null
                    )
                    {
                        this.#evoke_error();
                    }

                    if (op0.type === Object.typeof.array)
                    {
                        var number = op1.data;
                        if (op1.type === Object.typeof.number) 
                        {
                            number = Math.trunc(number);
                        }
                        if (op1.type === Object.typeof.bool) 
                        {
                            number = Number(number);
                        }

                        var array = [];
                        for (var count = 0; count < number; ++count)
                        {
                            array.push(...op0.data);
                        }

                        this.#set(operands[0], Object.typeof.array, array);

                        break;
                    }
                    if (op0.type === Object.typeof.string)
                    {
                        var number = op1.data;
                        if (op1.type === Object.typeof.number) 
                        {
                            number = Math.trunc(number);
                        }
                        if (op1.type === Object.typeof.bool)
                        {
                            number = Number(number);
                        }
                        
                        var string = "";
                        for (var count = 0; count < number; ++count)
                        {
                            string += op0.data;
                        }

                        this.#set(operands[0], Object.typeof.string, string);

                        break;
                    }

                    this.#set(operands[0], Object.typeof.number, op0.data * op1.data);
                }
                break;
                case "/=":
                {
                    const op0 = this.#get(operands[0]);
                    const op1 = this.#get(operands[1]);

                    if (op0.type !== Object.typeof.number ||
                        op1.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (op1.data == 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    this.#set(operands[0], Object.typeof.number, op0.data / op1.data);
                }
                break;
                case "//=":
                {
                    const op0 = this.#get(operands[0]);
                    const op1 = this.#get(operands[1]);

                    if (op0.type !== Object.typeof.number ||
                        op1.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (op1.data === 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    this.#set(operands[0], Object.typeof.number, Math.trunc(op0.data / op1.data));
                }
                break;
                case "%=":
                {
                    const op0 = this.#get(operands[0]);
                    const op1 = this.#get(operands[1]);

                    if (op0.type !== Object.typeof.number ||
                        op1.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (op1.data == 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    this.#set(operands[0], Object.typeof.number, op0.data % op1.data);
                }
                break;

                case "print":
                {
                     for (const position of operands)
                     {
                        this.#print(this.#get(position));
                     }
                }
                break;
                case "await":
                {
                    var text = "Input";

                    if (operands[0] !== -1)
                    {
                        text = String(this.#get(operands[0]).data);
                    }

                    end = true;
                    wait_for_input(text);
                }
                break;
                case "input":
                {
                    const text = get_input();       

                    this.#set(operands[0], Object.typeof.string, text);
                }
                break;

                case "isb":
                {
                    this.#set(operands[0], Object.typeof.bool, this.#get(operands[1]).type === Object.typeof.bool);
                }
                break;
                case "isn":
                {
                    this.#set(operands[0], Object.typeof.bool, this.#get(operands[1]).type === Object.typeof.number);
                }
                break;
                case "iss":
                {
                    this.#set(operands[0], Object.typeof.bool, this.#get(operands[1]).type === Object.typeof.string);
                }
                break;
                case "isa":
                {
                    this.#set(operands[0], Object.typeof.bool, this.#get(operands[1]).type === Object.typeof.array);
                }
                break;

                case "len":
                {
                    const sequence = this.#get(operands[1]);

                    if (sequence.type !== Object.typeof.string &&
                        sequence.type !== Object.typeof.array
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#set(operands[0], Object.typeof.number, sequence.data.length);
                }
                break;

                case "slice":
                {
                    const op1 = this.#get(operands[1]);
                    const op2 = this.#get(operands[2]);
                    const op3 = this.#get(operands[3]);

                    if (op1.type !== Object.typeof.string &&
                        op1.type !== Object.typeof.array ||
                        op2.type !== Object.typeof.number ||
                        op3.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#set(operands[0], op1.type, op1.slice(op2.data, op3.data));
                }
                break;

                case "bool":
                {
                    const op1 = this.#get(operands[1]);

                    switch (op1.type)
                    {
                        case Object.typeof.bool:
                        {
                            this.#set(operands[0], Object.typeof.bool, op1.data);
                        }
                        break;

                        case Object.typeof.number:
                        {
                            this.#set(operands[0], Object.typeof.bool, op1.data != 0);
                        }
                        break;

                        case Object.typeof.string:
                        {
                            this.#set(operands[0], Object.typeof.bool, op1.data === "true");
                        }
                        break;

                        default:
                            this.#evoke_error();
                    }
                }
                break;

                case "num":
                {
                    const op1 = this.#get(operands[1]);

                    switch (op1.type)
                    {
                        case Object.typeof.bool:
                        case Object.typeof.number:
                        case Object.typeof.string:
                        {
                            this.#set(operands[0], Object.typeof.number, Number(op1.data));
                        }
                        break;

                        default:
                            this.#evoke_error();
                    }
                }
                break;

                case "str":
                {
                    const op1 = this.#get(operands[1]);

                    switch (op1.type)
                    {
                        case Object.typeof.bool:
                        case Object.typeof.number:
                        case Object.typeof.string:
                        {
                            this.#set(operands[0], Object.typeof.string, String(op1.data));
                        }
                        break;

                        default:
                            this.#evoke_error();
                    }
                }
                break;

                case "or":
                {
                    const op1 = this.#get(operands[1]);
                    const op2 = this.#get(operands[2]);

                    if (op1.type !== Object.typeof.bool &&
                        op1.type !== Object.typeof.number ||
                        op2.type !== Object.typeof.bool &&
                        op2.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#set(operands[0], Object.typeof.bool, op1.data || op2.data);
                }
                break;
                case "and":
                {
                    const op1 = this.#get(operands[1]);
                    const op2 = this.#get(operands[2]);

                    if (op1.type !== Object.typeof.bool &&
                        op1.type !== Object.typeof.number ||
                        op2.type !== Object.typeof.bool &&
                        op2.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#set(operands[0], Object.typeof.bool, op1.data && op2.data);
                }
                break;

                case "|":
                {
                    const op1 = this.#get(operands[1]);
                    const op2 = this.#get(operands[2]);

                    if (op1.type !== Object.typeof.bool &&
                        op1.type !== Object.typeof.number ||
                        op2.type !== Object.typeof.bool &&
                        op2.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#set(operands[0], Object.typeof.bool, op1.data | op2.data);
                }
                break;
                case "^":
                {
                    const op1 = this.#get(operands[1]);
                    const op2 = this.#get(operands[2]);

                    if (op1.type !== Object.typeof.bool &&
                        op1.type !== Object.typeof.number ||
                        op2.type !== Object.typeof.bool &&
                        op2.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#set(operands[0], Object.typeof.bool, op1.data ^ op2.data);
                }
                break;
                case "&":
                {
                    const op1 = this.#get(operands[1]);
                    const op2 = this.#get(operands[2]);

                    if (op1.type !== Object.typeof.bool &&
                        op1.type !== Object.typeof.number ||
                        op2.type !== Object.typeof.bool &&
                        op2.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#set(operands[0], Object.typeof.bool, op1.data & op2.data);
                }
                break;

                case "==":
                {
                    const op1 = this.#get(operands[1]);
                    const op2 = this.#get(operands[2]);

                    if (op1.type === Object.typeof.null ||
                        op2.type === Object.typeof.null 
                    )
                    {
                        this.#set(operands[0], Object.typeof.bool, op1.type === op2.type);

                        break;
                    }

                    this.#set(operands[0], Object.typeof.bool, op1.data == op2.data);
                }
                break;
                case "!=":
                    {
                        const op1 = this.#get(operands[1]);
                    const op2 = this.#get(operands[2]);

                    if (op1.type === Object.typeof.null ||
                        op2.type === Object.typeof.null 
                    )
                    {
                        this.#set(operands[0], Object.typeof.bool, op1.type !== op2.type);

                        break;
                    }

                    this.#set(operands[0], Object.typeof.bool, op1.data != op2.data);
                    }
                break;
                case "===":
                {
                    const op1 = this.#get(operands[1]);
                    const op2 = this.#get(operands[2]);

                    if (op1.type === Object.typeof.null ||
                        op2.type === Object.typeof.null 
                    )
                    {
                        this.#set(operands[0], Object.typeof.bool, op1.type === op2.type);

                        break;
                    }

                    this.#set(operands[0], Object.typeof.bool, op1.data === op2.data);
                }
                break;
                case "!==":
                {
                    const op1 = this.#get(operands[1]);
                    const op2 = this.#get(operands[2]);

                    if (op1.type === Object.typeof.null ||
                        op2.type === Object.typeof.null 
                    )
                    {
                        this.#set(operands[0], Object.typeof.bool, op1.type === op2.type);

                        break;
                    }

                    this.#set(operands[0], Object.typeof.bool, op1.data !== op2.data);
                }
                break;

                case "<":
                {
                    const op1 = this.#get(operands[1]);
                    const op2 = this.#get(operands[2]);

                    if (op1.type !== Object.typeof.bool &&
                        op1.type !== Object.typeof.number ||
                        op2.type !== Object.typeof.bool &&
                        op2.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#set(operands[0], Object.typeof.bool, op1.data < op2.data);
                }
                break;
                case ">":
                {
                    const op1 = this.#get(operands[1]);
                    const op2 = this.#get(operands[2]);

                    if (op1.type !== Object.typeof.bool &&
                        op1.type !== Object.typeof.number ||
                        op2.type !== Object.typeof.bool &&
                        op2.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#set(operands[0], Object.typeof.bool, op1.data > op2.data);
                }
                break;
                case "<=":
                {
                    const op1 = this.#get(operands[1]);
                    const op2 = this.#get(operands[2]);

                    if (op1.type !== Object.typeof.bool &&
                        op1.type !== Object.typeof.number ||
                        op2.type !== Object.typeof.bool &&
                        op2.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#set(operands[0], Object.typeof.bool, op1.data <= op2.data);
                }
                break;
                case ">=":
                {
                    const op1 = this.#get(operands[1]);
                    const op2 = this.#get(operands[2]);

                    if (op1.type !== Object.typeof.bool &&
                        op1.type !== Object.typeof.number ||
                        op2.type !== Object.typeof.bool &&
                        op2.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#set(operands[0], Object.typeof.bool, op1.data >= op2.data);
                }
                break;

                case "+":
                {
                    const op1 = this.#get(operands[1]);
                    const op2 = this.#get(operands[2]);

                    if (op1.type === Object.typeof.array &&
                        op2.type === Object.typeof.array 
                    )
                    {
                        var result = op1.data;
                        result.push(...op2.data);
                        
                        this.#set(operands[0], Object.typeof.array, result);

                        break;
                    }
                    if (op1.type === Object.typeof.null ||
                        op2.type === Object.typeof.null ||
                        op1.type === Object.typeof.array ||
                        op2.type === Object.typeof.array 
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#set(operands[0], Math.max(op1.type, op2.type), op1.data + op2.data);
                }
                break;
                case "-":
                {
                    const op1 = this.#get(operands[1]);
                    const op2 = this.#get(operands[2]);

                    if (op1.type !== Object.typeof.bool &&
                        op1.type !== Object.typeof.number ||
                        op2.type !== Object.typeof.bool &&
                        op2.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    this.#set(operands[0], Math.max(op1.type, op2.type), op1.data - op2.data);
                }
                break;

                case "*":
                {
                    const op1 = this.#get(operands[1]);
                    const op2 = this.#get(operands[2]);

                    if (op2.type !== Object.typeof.number &&
                        op2.type !== Object.typeof.bool ||
                        op1.type === Object.typeof.null
                    )
                    {
                        this.#evoke_error();
                    }

                    if (op1.type === Object.typeof.array)
                    {
                        var number = op2.data;
                        if (op2.type === Object.typeof.number) 
                        {
                            number = Math.trunc(number);
                        }
                        if (op2.type === Object.typeof.bool) 
                        {
                            number = Number(number);
                        }

                        var array = [];
                        for (var count = 0; count < number; ++count)
                        {
                            array.push(...op1.data);
                        }

                        this.#set(operands[0], Object.typeof.array, array);

                        break;
                    }
                    if (op1.type === Object.typeof.string)
                    {
                        var number = op2.data;
                        if (op2.type === Object.typeof.number) 
                        {
                            number = Math.trunc(number);
                        }
                        if (op2.type === Object.typeof.bool)
                        {
                            number = Number(number);
                        }
                        
                        var string = "";
                        for (var count = 0; count < number; ++count)
                        {
                            string += op1.data;
                        }

                        this.#set(operands[0], Object.typeof.string, string);

                        break;
                    }

                    this.#set(operands[0], Object.typeof.number, op1.data * op2.data);
                }
                break;
                case "/":
                {
                    const op1 = this.#get(operands[1]);
                    const op2 = this.#get(operands[2]);

                    if (op1.type !== Object.typeof.number ||
                        op2.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (op2.data == 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    this.#set(operands[0], Object.typeof.number, op1.data / op2.data);
                }
                break;
                case "//":
                {
                    const op1 = this.#get(operands[1]);
                    const op2 = this.#get(operands[2]);

                    if (op1.type !== Object.typeof.number ||
                        op2.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (op2.data == 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    this.#set(operands[0], Object.typeof.number, Math.trunc(op1.data / op2.data));
                }
                break;
                case "%":
                {
                    const op1 = this.#get(operands[1]);
                    const op2 = this.#get(operands[2]);

                    if (op1.type !== Object.typeof.number ||
                        op2.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (op2.data == 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    this.#set(operands[0], Object.typeof.number, op1.data % op2.data);
                }
                break;
            }

            ++this.#current_operation;
            if (end)
            {
                break;
            }
        }

        this.overall_time += performance.now() - this.#time_start;
        this.#time_start = null;
    }
}