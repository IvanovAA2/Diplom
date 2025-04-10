
class Data
{
    type;
    data;

    constructor (type, data)
    {
        this.type = type;
        this.data = data;
    }
}

class Object
{
    obj;

    static typeof =
    {
        variable    : 0,
        function    : 1,
        value       : 2,

        null    : 0,
        bool    : 1,
        number  : 2,
        string  : 3,
        array   : 4,
    }

    static data_name = new Map
    ([
        [0, "null"],
        [1, "bool"],
        [2, "number"],
        [3, "string"],
        [4, "array"],
    ])

    static symbol_name = new Map
    ([
        [0, "var-l"],
        [1, "fun-n"],
        [2, "value"],
    ])

    constructor (type, data)
    {
        this.obj = new Data(type, data);
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

    #operations = [];
    #scope_tree = [new Scope(-1)];
    #links      = [];

    #current_operation  = 0;
    #current_scope      = 0;

    #time_start         = null;
    overall_time        = 0;

    constructor (parse_tree) 
    {
        this.#parse_tree = parse_tree;

        this.#generate_program();
    }

    #visitor (node, arg = null)
    {
        // DEBUG
        
        console.log(node.rule_name);
        
        // DEBUG

        switch (node.rule_name)
        {
            case "Program":
            {
                this.#visitor(node.children[0], [null, null, null, null]);

                // REDO
            }
            break;

            case "Statements":
            {
                for (const children of node.children)
                {
                    this.#visitor(children, arg);
                }
            }
            break;
            case "Statement":
            {
                this.#visitor(node.children[0], arg);
            }
            break;
            case "Scope":
            {
                this.#branch_scope();
                
                this.#visitor(node.children[1], arg);

                this.#leave_scope();
            }
            break;

            case "BoolExpression":
            {
                const bool_result   = this.#create_link();
                const result        = this.#visitor(node.children[0], arg);

                const operation = this.#create_operation("bool", [null, null], null);
                this.#add_to_link(bool_result, operation, 0);
                this.#add_to_link(result, operation, 1);

                return bool_result;
            }
            break;

            case "Conditional":
            {
                const end       = this.#create_link();
                var new_arg   = structuredClone(arg);

                const end_create = this.#create_operation("create", [null, new Object(null, null)], null);
                this.#add_to_link(end, end_create, 0);
                new_arg[0] = [end, end_create];

                if (node.children.length === 1)
                {
                    this.#visitor(node.children[0], new_arg);

                    this.#operations[end_create].operands[1].obj.data = this.#operations.length - 1;
                }
                if (node.children.length === 2)
                {
                    this.#visitor(node.children[0], new_arg);
                    this.#visitor(node.children[1], new_arg);
                }
            }
            break;
            case "$ElifBlock":
            {
                if (node.children.length === 1)
                {
                    this.#visitor(node.children[0], arg);

                    this.#operations[arg[0][1]].operands[1].obj.data = this.operations.length - 1;
                }
                if (node.children.length === 2)
                {
                    this.#visitor(node.children[0], arg);
                    this.#visitor(node.children[1], arg);
                }
            }
            break;
            case "IfBlock":
            {
                const bool_expression = this.#visitor(node.children[2], null);

                const if_jump = this.#create_operation("if", [new Object(null, null), null], null);
                this.#add_to_link(bool_expression, if_jump, 1);

                this.#visitor(node.children[4], arg);

                const end_jump = this.#create_operation("jump", [null], null);
                this.#add_to_link(arg[0][0], end_jump, 0);

                this.#operations[if_jump].operands[0].obj.data = end_jump;
            }
            break;
            case "ElifBlock":
            {
                const bool_expression = this.#visitor(node.children[2], null);

                const if_jump = this.#create_operation("if", [new Object(null, null), null], null);
                this.#add_to_link(bool_expression, if_jump, 1);

                this.#visitor(node.children[4], arg);

                const end_jump = this.#create_operation("jump", [null], null);
                this.#add_to_link(arg[0][0], end_jump, 0);

                this.#operations[if_jump].operands[0].obj.data = end_jump;
            }
            break;
            case "ElseBlock":
            {
                this.#visitor(node.children[1], arg);
            }
            break;

            case "Loop":
            {
                this.#visitor(node.children[0], arg);
            }
            break;
            case "While":
            {
                this.#branch_scope();

                var new_arg = structuredClone(arg); 

                const break_jump = this.#create_operation("=", [null, new Object(null, null)], null);
                
                const begin_jump = this.#operations.length - 1; 
                const bool_expression = this.#visitor(node.children[2], null); 
                
                new_arg[1] = [begin_jump];
                new_arg[2] = [this.#create_link(), break_jump];
                this.#add_to_link(new_arg[2][0], break_jump, 0);

                const if_jump = this.#create_operation("if", [null, null], null);
                this.#add_to_link(new_arg[2][0], if_jump, 0);
                this.#add_to_link(bool_expression, if_jump, 1);

                this.#visitor(node.children[4], new_arg);

                const end_jump = this.#create_operation("jump", [new Object(null, new_arg[1][0])], null);

                this.#operations[break_jump].operands[1].obj.data = end_jump;

                this.#leave_scope();
            }
            break;
            case "For":
            {
                this.#branch_scope();

                var new_arg = structuredClone(arg); 

                const break_jump = this.#create_operation("=", [null, new Object(null, null)], null);
                
                this.#visitor(node.children[2], null); 

                const begin_jump = this.#operations.length - 1; 
                const bool_expression = this.#visitor(node.children[4], null); 
                
                new_arg[1] = [begin_jump];
                new_arg[2] = [this.#create_link(), break_jump];
                this.#add_to_link(new_arg[2][0], break_jump, 0);

                const if_jump = this.#create_operation("if", [null, null], null);
                this.#add_to_link(new_arg[2][0], if_jump, 0);
                this.#add_to_link(bool_expression, if_jump, 1);

                this.#visitor(node.children[8], new_arg);
                this.#visitor(node.children[6], new_arg);

                const end_jump = this.#create_operation("jump", [new Object(null, new_arg[1][0])], null);

                this.#operations[break_jump].operands[1].obj.data = end_jump;

                this.#leave_scope();
            }
            break;
            case "ExpressionOrDeclaration":
            {
                this.#visitor(node.children[0]);
            }
            break;
            case "FlowControl":
            {
                switch (node.children[0].children.string)
                {
                    case "continue":
                    {
                        const jump = this.#create_operation("jump", [new Object(null, arg[1][0])], null);
                    }
                    break;
                    case "break":
                    {
                        const jump = this.#create_operation("jump", [null], null);
                        this.#add_to_link(arg[2][0], jump, 0);
                    }
                    break;
                    case "return":
                    {
                        // TODO
                    }
                    break;
                }
            }
            break;

            case "Declaration":
            {
                this.#visitor(node.children[1], arg);

                if (node.children.length === 3)
                {
                    this.#visitor(node.children[2], arg);
                }
            }
            break;
            case "$Declaration":
            {
                this.#visitor(node.children[1], arg);

                if (node.children.length === 3)
                {
                    this.#visitor(node.children[2], arg);
                }
            }
            break;
            case "SingleDeclaration":
            {
                const name      = node.children[0].children.string;
                const position  = node.children[0].children.position;

                this.#create_variable(name, position);

                if (node.children.length === 2)
                {
                    this.#visitor(node.children[1], this.#get_variable(name, position));
                }
            }
            break;
            case "$SingleDeclaration":
            {
                const variable  = arg;
                const value     = this.#visitor(node.children[1], null);
                const position  = node.children[0].children.position;

                const operation = this.#create_operation("=", [null, null], position);
                this.#add_to_link(variable, operation, 0);
                this.#add_to_link(value, operation, 1);
            }
            break;

            case "Expressions":
            {
                for (const children of node.children)
                {
                    this.#visitor(children, arg);
                }
            }
            break;
            case "$Expressions":
            {
                for (const children of node.children)
                {
                    this.#visitor(children, arg);
                }
            }
            break;
            case "Expression":
            {
                return this.#visitor(node.children[0], arg);
            }
            break;

            case "AssignOp":
            {
                const link = this.#visitor(node.children[0], arg);

                if (node.children.length === 1)
                {
                    return link;
                }

                return this.#visitor(node.children[1], link);
            }
            break;
            case "$AssignOp":
            {
                const left              = arg;
                const right             = this.#visitor(node.children[1], null);
                const position          = node.children[0].children.position;
                const opearation_type   = node.children[0].children.string;

                const operation = this.#create_operation(opearation_type, [null, null], position);
                this.#add_to_link(left, operation, 0);
                this.#add_to_link(right, operation, 1);

                return left;
            }
            break;
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
                const link = this.#visitor(node.children[0], arg);

                if (node.children.length === 2)
                {
                    return this.#visitor(node.children[1], link);
                }
                
                return link;
            }
            break;
            case "$BoolOr":
            case "$BoolAnd":
            case "$BitOr":
            case "$BitXor":
            case "$BitAnd":
            case "$EqualOp":
            case "$CompOp":
            case "$AddOp":
            case "$MulOp":
            {
                const left              = arg;
                const right             = this.#visitor(node.children[1], null);
                const result            = this.#create_link();
                const position          = node.children[0].children.position;
                const opearation_type   = node.children[0].children.string;
                
                const operation = this.#create_operation(opearation_type, [null, null, null], position);
                this.#add_to_link(result, operation, 0);
                this.#add_to_link(left, operation, 1);
                this.#add_to_link(right, operation, 2);

                if (node.children.length === 3)
                {
                    return this.#visitor(node.children[2], result);
                }

                return result;
            }
            break;

            case "$Value":
            {
                const value = this.#visitor(node.children[0], arg);

                if (node.children.length === 2)
                {
                    return this.#visitor(node.children[1], value);
                }

                return value;
            }
            break;
            case "Accessing":
            {
                const value = this.#visitor(node.children[0], arg);

                if (node.children.length === 2)
                {
                    return this.#visitor(node.children[1], value);
                }

                return value;
            }
            break;
            case "SingleAccessing":
            {
                if (node.children[0].rule_name === ".")
                {
                    return this.#visitor(node.children[1], arg);
                }
                else
                {
                    if (node.children.length === 3)
                    {
                        const result    = this.#create_link();
                        const array     = arg;
                        const index     = this.#visitor(node.children[1], null);
                        const position  = node.children[0].children.position;

                        const operation = this.#create_operation("arac", [null, null, null], position);
                        this.#add_to_link(result, operation, 0);
                        this.#add_to_link(array, operation, 1);
                        this.#add_to_link(index, operation, 2);

                        return result;
                    }
                    if (node.children.length === 4)
                    {
                        const result    = this.#create_link();
                        const sequence  = arg;
                        const begin     = this.#visitor(node.children[1], null);
                        const end       = this.#visitor(node.children[2], null);
                        const position  = node.children[0].children.position;

                        const operation = this.#create_operation("slice", [null, null, null, null], position);
                        this.#add_to_link(result, operation, 0);
                        this.#add_to_link(sequence, operation, 1);
                        this.#add_to_link(begin, operation, 2);
                        this.#add_to_link(end, operation, 3);

                        return result;
                    }
                }
            }
            break;
            case "Slice":
            {
                return this.#visitor(node.children[1], arg);
            }
            break;
            case "MemberAccessing":
            {
                const name      = node.children[0].rule_name;
                const position  = node.children[0].children.position;

                switch (name) 
                {
                    case "len":
                    {
                        const sequence  = arg;
                        const length    = this.#create_link();

                        const operation = this.#create_operation("len", [null, null], position);
                        this.#add_to_link(length, operation, 0);
                        this.#add_to_link(sequence, operation, 1);

                        return length;
                    }
                    break;

                    case "push":
                    {
                        const array     = arg;
                        const element   = this.#visitor(node.children[2], null);

                        const operation = this.#create_operation("push", [null, null], position);
                        this.#add_to_link(array, operation, 0);
                        this.#add_to_link(element, operation, 1);

                        return array;
                    }
                    break;

                    case "split":
                    {
                        const array     = this.#create_link();
                        const string    = arg;
                        const separator = this.#visitor(node.children[2], null);

                        const operation = this.#create_operation("split", [null, null, null], position);
                        this.#add_to_link(array, operation, 0);
                        this.#add_to_link(string, operation, 1);
                        this.#add_to_link(separator, operation, 2);

                        return array;
                    }
                    break;
                    case "join":
                    {
                        const string    = this.#create_link();
                        const array     = arg;
                        const separator = this.#visitor(node.children[2], null);

                        const operation = this.#create_operation("join", [null, null, null], position);
                        this.#add_to_link(string, operation, 0);
                        this.#add_to_link(array, operation, 1);
                        this.#add_to_link(separator, operation, 2);

                        return string;
                    }
                    break;
                }
            }
            break;

            case "Value":
            {
                if (node.children.length === 1)
                {
                    return this.#visitor(node.children[0], arg);
                }
                if (node.children.length === 2)
                {
                    
                }
                if (node.children.length === 3)
                {
                    return this.#visitor(node.children[1], arg);
                }
            }
            break;
            case "id":
            {
                return this.#get_variable(node.children.string, node.children.position);
            }
            break;

            case "FunctionCall":
            {

            }
            break;
            case "DefaultFunctionCall":
            {
                const name = node.children[0].children.string;

                switch (name)
                {
                    case "print":
                    {
                        const parameters = this.#visitor(node.children[2], null);

                        const print = this.#create_operation("print", [null], null);
                        this.#add_to_link(parameters, print, 0)
                    }
                    break;
                    case "input":
                    {
                        const output_text = this.#visitor(node.children[2], null);
                        const input_text = this.#create_link();

                        const await = this.#create_operation("await", [null], null);
                        this.#add_to_link(output_text, await, 0);
                        const input = this.#create_operation("input", [null], null);
                        this.#add_to_link(input_text, input, 0);

                        return input_text;
                    }
                    break;
                }
            }
            break;

            case "Parameters":
            {
                const parameters    = this.#create_value(Object.typeof.array, []);
                const element       = this.#visitor(node.children[0], null); 

                const operation = this.#create_operation("push", [null, null], null);
                this.#add_to_link(parameters, operation, 0);
                this.#add_to_link(element, operation, 1);

                if (node.children.length === 2)
                {
                    this.#visitor(node.children[1], parameters);
                }
                
                return parameters;
            }
            break;
            case "$Parameters":
            {
                const parameters    = arg;
                const element       = this.#visitor(node.children[1], null); 

                const operation = this.#create_operation("push", [null, null], null);
                this.#add_to_link(parameters, operation, 0);
                this.#add_to_link(element, operation, 1);

                if (node.children.length === 3)
                {
                    this.#visitor(node.children[2], parameters);
                }
            }
            break;

            case "Null":
            {
                return this.#create_value(Object.typeof.null, null);
            }
            break;
            case "Boolean":
            {
                if (node.children.length === 1)
                {
                    return this.#visitor(node.children[0], arg);
                }

                const expression    = this.#visitor(node.children[2], arg);
                const result        = this.#create_link();
                const position      = node.children[0].children.position;

                const operation = this.#create_operation("bool", [null, null], position);
                this.#add_to_link(result, operation, 0);
                this.#add_to_link(expression, operation, 1);

                return result;
            }
            break;
            case "true":
            {
                return this.#create_value(Object.typeof.bool, true);
            }
            break;
            case "false":
            {
                return this.#create_value(Object.typeof.bool, false);
            }
            break;
            case "Number":
            {
                if (node.children.length === 1)
                {
                    return this.#create_value(Object.typeof.number, Number(node.children[0].children.string));
                }

                const expression    = this.#visitor(node.children[2], arg);
                const result        = this.#create_link();
                const position      = node.children[0].children.position;

                const operation = this.#create_operation("num", [null, null], position);
                this.#add_to_link(result, operation, 0);
                this.#add_to_link(expression, operation, 1);

                return result;
            }
            break;
            case "String":
            {
                if (node.children.length === 1)
                {
                    return this.#create_value(Object.typeof.string, node.children[0].children.string);
                }

                const expression    = this.#visitor(node.children[2], arg);
                const result        = this.#create_link();
                const position      = node.children[0].children.position;

                const operation = this.#create_operation("str", [null, null], position);
                this.#add_to_link(result, operation, 0);
                this.#add_to_link(expression, operation, 1);

                return result;
            }
            break;
            case "Array":
            {
                const result = this.#create_value(Object.typeof.array, []);

                if (node.children.length === 3)
                {
                    this.#visitor(node.children[1], result);
                }
                
                return result;
            }
            break;
            case "$Array":
            {
                const array     = arg;
                const element   = this.#visitor(node.children[0], null); 

                const operation = this.#create_operation("push", [null, null], null);
                this.#add_to_link(array, operation, 0);
                this.#add_to_link(element, operation, 1);

                if (node.children.length === 2)
                {
                    this.#visitor(node.children[1], array);
                }
            }
            break;
            case "$$Array":
            {
                const array     = arg;
                const element   = this.#visitor(node.children[1], null); 

                const operation = this.#create_operation("push", [null, null], null);
                this.#add_to_link(array, operation, 0);
                this.#add_to_link(element, operation, 1);

                if (node.children.length === 3)
                {
                    this.#visitor(node.children[2], array);
                }
            }
            break;
        }
    }

    #generate_program ()
    {
        this.#visitor(this.#parse_tree);
    }

    #create_link ()
    {
        const link = this.#links.length;

        this.#links.push([]);

        return link;
    }

    #add_to_link (link, operation, position)
    {
        this.#links[link].push([operation, position]);
    }

    #create_value (type, data)
    {
        const link = this.#create_link();
        
        const operation = this.#create_operation("create", [null, new Object(type, data)], null);
        this.#add_to_link(link, operation, 0);

        return link;
    }

    #create_operation (type, operands, position)
    {
        const operation = this.#operations.length;

        this.#operations.push(new Operation(type, operands, position));

        return operation;
    }

    #create_variable (name, position)
    {
        const symbol_table = this.#scope_tree[this.#current_scope].symbol_table;

        if (symbol_table.has(name))
        {
            throw new Error(`second declaration of "${name}" at (${position.row}, ${position.column})`);
        }

        const variable = this.#create_link();

        const operation = this.#create_operation("var", [null], position)
        this.#add_to_link(variable, operation, 0);

        symbol_table.set(name, variable);
    }

    #get_variable (name, position)
    {
        var scope = this.#current_scope;

        while (this.#scope_tree[scope].symbol_table.has(name) === false) 
        {
            scope = this.#scope_tree[scope].parent;

            if (scope === -1) 
            {
                throw new Error(`undeclared variable named "${name}" at (${position.row}, ${position.column})`);
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
                message += Object.data_name.get(operands[index].obj.type);
            }
            if (index >= to)
            {
                break;
            }
        }
        if (position !== null)
        {
            message += `] at (${position.row}, ${position.column})`;
        }
        else
        {
            message += `]`;
        }

        throw new Error(message);
    }

    #print (object)
    {
        switch (object.obj.type)
        {
            case Object.typeof.null:
            {
                addOutput("null");
            }
            break;

            case Object.typeof.bool:
            case Object.typeof.number:
            {
                addOutput(String(object.obj.data));   
            }
            break;
            case Object.typeof.string:
            {
                addOutput('"' + object.obj.data + '"');   
            }
            break;

            case Object.typeof.array:
            {
                addOutput("[");

                for (const index in object.obj.data)
                {
                    const element = object.obj.data[index];
        
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
                console.log(`unknown type: ${object.obj.type}, object ${object}`);
        }
    }

    async run (create_links = true) 
    {

        if (create_links)
        {
            // DEBUG

            for (const op in this.#operations)
            {
                console.log(op + ": " + this.#operations[op].type);
            }
            for (const link of this.#links)
            {
                var res = "";

                for (const position of link)
                {
                    res += "(" + position[0] + ", " + position[1] + ") ";
                }

                console.log(res);
            }

            // DEBUG

            for (const objects of this.#links)
            {
                const link = new Object(Object.typeof.null, null);

                for (const object of objects)
                {
                    const operation = object[0];
                    const position  = object[1];

                    this.#operations[operation].operands[position] = link;
                }
            }
        }

        this.#time_start = performance.now();
        
        // DEBUG    
        
        // if (this.#current_operation === 0)
        // {
        //     console.log(this.#operations);
        //     this.#print_data();
        //     console.log(this.#data);
            
        //     this.#return_jumps = [];
        // }
        console.log(this.#operations);
        
        // DEBUG

        var end = false;
        
        while (this.#current_operation < this.#operations.length)
        {
            const current_operation     = this.#operations[this.#current_operation];
            const operation_type        = current_operation.type;
            const operands              = current_operation.operands;
            const position              = current_operation.position;

            // DEBUG

            console.log("---------------------------------");
            console.log(this.#current_operation + ": " + operation_type);

            console.log("before:");
            for (const op in operands)
            {
                if (operands[op].obj.type === Object.typeof.array)
                {
                    var res = op + ": array \t";
                    for (const element of operands[op].obj.data)
                    {
                        res += " " + element.obj.data
                    }
                    console.log(res);
                }
                else{
                    console.log(op + ": " + Object.data_name.get(operands[op].obj.type) + " \t" + operands[op].obj.data);
                }
            }

            // await new Promise(r => setTimeout(r, 1000)); // -----------------------PAUSE--------------------------------
            
            // DEBUG

            switch (operation_type)
            {
                case "if":
                {
                    const bool_expression = operands[1];

                    if (bool_expression.obj.data === false)
                    {
                        this.#current_operation = operands[0].obj.data;
                    }
                }
                break;
                case "jump":
                {
                    this.#current_operation = operands[0].obj.data;
                }
                break;

                case "create":
                {
                    const object = operands[0];
                    const value = operands[1];

                    object.obj = structuredClone(value.obj);
                }
                break;

                case "push":
                {
                    const array = operands[0];
                    const value = operands[1];

                    if (array.obj.type !== Object.typeof.array)
                    {
                        throw new Error(`can't push not into array at (${position.row}, ${position.column})`);
                    }

                    array.obj.data.push(structuredClone(value));
                }
                break;

                case "=":   
                {
                    const object = operands[0];
                    const value = operands[1];

                    const data = structuredClone(value.obj.data);
                    object.obj.type = value.obj.type;
                    object.obj.data = data;
                }
                break;
                case "+=":
                {
                    const object = operands[0];
                    const value = operands[1];

                    if (object.obj.type === Object.typeof.array &&
                        value.obj.type === Object.typeof.array 
                    )
                    {
                        var result = structuredClone(object.obj.data);
                        result.push(...structuredClone(value.obj.data));
                        
                        object.obj.data = result;

                        break;
                    }
                    if (object.obj.type === Object.typeof.null ||
                        value.obj.type === Object.typeof.null ||
                        object.obj.type === Object.typeof.array ||
                        value.obj.type === Object.typeof.array 
                    )
                    {
                        this.#evoke_error();
                    }

                    object.obj.type = Math.max(object.obj.type, value.obj.type);
                    object.obj.data += value.obj.data;
                }
                break;
                case "-=":
                {
                    const object = operands[0];
                    const value = operands[1];

                    if (object.obj.type !== Object.typeof.bool &&
                        object.obj.type !== Object.typeof.number ||
                        value.obj.type !== Object.typeof.bool &&
                        value.obj.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    object.obj.type = Object.typeof.number;
                    object.obj.data -= value.obj.data;
                }
                break;
                case "*=":
                {
                    const object = operands[0];
                    const value = operands[1];

                    if (value.obj.type !== Object.typeof.number &&
                        value.obj.type !== Object.typeof.bool ||
                        object.obj.type === Object.typeof.null
                    )
                    {
                        this.#evoke_error();
                    }

                    if (object.obj.type === Object.typeof.array)
                    {
                        var number = value.obj.data;
                        if (value.obj.type === Object.typeof.number) 
                        {
                            number = Math.trunc(number);
                        }
                        if (value.obj.type === Object.typeof.bool) 
                        {
                            number = Number(number);
                        }

                        var array = [];
                        for (var count = 0; count < number; ++count)
                        {
                            array.push(...structuredClone(object.obj.data));
                        }

                        object.obj.type = Object.typeof.array;
                        object.obj.data = array;

                        break;
                    }
                    if (object.obj.type === Object.typeof.string)
                    {
                        var number = value.obj.data;
                        if (value.obj.type === Object.typeof.number) 
                        {
                            number = Math.trunc(number);
                        }
                        if (value.obj.type === Object.typeof.bool)
                        {
                            number = Number(number);
                        }
                        
                        var string = "";
                        for (var count = 0; count < number; ++count)
                        {
                            string += object.obj.data;
                        }

                        object.obj.type = Object.typeof.string;
                        object.obj.data = string;

                        break;
                    }

                    object.obj.type = Object.typeof.number;
                    object.obj.data *= value.obj.data;
                }
                break;
                case "/=":
                {
                    const object = operands[0];
                    const value = operands[1];

                    if (object.obj.type !== Object.typeof.number ||
                        value.obj.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (value.obj.data == 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    object.obj.type = Object.typeof.number;
                    object.obj.data /= value.obj.data;
                }
                break;
                case "//=":
                {
                    const object = operands[0];
                    const value = operands[1];

                    if (object.obj.type !== Object.typeof.number ||
                        value.obj.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (value.obj.data == 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    object.obj.type = Object.typeof.number;
                    object.obj.data = Math.trunc(object.obj.data / value.obj.data);
                }
                break;
                case "%=":
                {
                    const object = operands[0];
                    const value = operands[1];

                    if (object.obj.type !== Object.typeof.number ||
                        value.obj.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (value.obj.data == 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    object.obj.type = Object.typeof.number;
                    object.obj.data %= value.obj.data;
                }
                break;

                case "print":
                {
                     for (const object of operands[0].obj.data)
                     {
                        this.#print(object);
                     }
                }
                break;
                case "await":
                {
                    if (operands[0].obj.type !== Object.typeof.string)
                    {
                        throw new Error(`only string allowed inside "input"`);
                    }

                    const text = operands[0].obj.data;

                    end = true;
                    wait_for_input(text);
                }
                break;
                case "input":
                {
                    const text = get_input();       

                    operands[0].obj.type = Object.typeof.string;
                    operands[0].obj.data = text;
                }
                break;

                case "isb":
                {
                    const result = operands[0];
                    const value = operands[1];

                    result.obj.type = Object.typeof.bool;
                    result.obj.data = value.obj.type === Object.typeof.bool;
                }
                break;
                case "isn":
                {
                    const result = operands[0];
                    const value = operands[1];

                    result.obj.type = Object.typeof.bool;
                    result.obj.data = value.obj.type === Object.typeof.number;
                }
                break;
                case "iss":
                {
                    const result = operands[0];
                    const value = operands[1];

                    result.obj.type = Object.typeof.bool;
                    result.obj.data = value.obj.type === Object.typeof.string;
                }
                break;
                case "isa":
                {
                    const result = operands[0];
                    const value = operands[1];

                    result.obj.type = Object.typeof.bool;
                    result.obj.data = value.obj.type === Object.typeof.array;
                }
                break;

                case "len":
                {
                    const result = operands[0];
                    const sequence = operands[1];

                    if (sequence.obj.type !== Object.typeof.string &&
                        sequence.obj.type !== Object.typeof.array
                    )
                    {
                        this.#evoke_error();
                    }

                    result.obj.type = Object.typeof.number;
                    result.obj.data = sequence.obj.data.length;
                }
                break;
                case "split":
                {
                    const array = operands[0];
                    const string = operands[1];
                    const separator = operands[2];

                    if (string.obj.type !== Object.typeof.string &&
                        separator.obj.type !== Object.typeof.string
                    )
                    {
                        this.#evoke_error();
                    }

                    array.obj.type = Object.typeof.array;

                    array.obj.data = [];
                    for (const element of string.obj.data.split(separator.obj.data))
                    {
                        array.obj.data.push(new Object(Object.typeof.string, element));
                    }
                }
                break;
                case "join":
                {
                    const string = operands[0];
                    const array = operands[1];
                    const separator = operands[2];

                    if (string.obj.type !== Object.typeof.string &&
                        separator.obj.type !== Object.typeof.string
                    )
                    {
                        this.#evoke_error();
                    }

                    string.obj.type = Object.typeof.string;

                    var temp_array = [];
                    for (const element of array.obj.data)
                    {
                        if (element.obj.type !== Object.typeof.string)
                        {
                            throw new Error(`can't join not strings at (${position.row}, ${position.column})`);
                        }

                        temp_array.push(element.obj.data);
                    }
                    string.obj.data = temp_array.join(separator.obj.data);
                }
                break;

                case "slice":
                {
                    const result    = operands[0];
                    const sequence  = operands[1];
                    const begin     = operands[2];
                    const end       = operands[3];

                    if (sequence.obj.type   !== Object.typeof.string    &&
                        sequence.obj.type   !== Object.typeof.array     ||
                        begin.obj.type      !== Object.typeof.number    ||
                        end.obj.type        !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    result.obj.data = sequence.obj.data.slice(begin.obj.data, end.obj.data);
                }
                break;
                case "arac":
                {
                    const result    = operands[0];
                    const array     = operands[1];
                    const index     = operands[2];

                    if (array.obj.type  !== Object.typeof.array ||
                        index.obj.type  !== Object.typeof.number 
                    )
                    {
                        this.#evoke_error();
                    }

                    result.obj = array.obj.data[index.obj.data].obj;
                }
                break;

                case "bool":
                {
                    const result = operands[0];
                    const value = operands[1];

                    result.obj.type = Object.typeof.bool;

                    switch (value.obj.type)
                    {
                        case Object.typeof.bool:
                        {
                            result.obj.data = value.obj.data;
                        }
                        break;

                        case Object.typeof.number:
                        {
                            result.obj.data = value.obj.data != 0;
                        }
                        break;

                        case Object.typeof.string:
                        {
                            result.obj.data = value.obj.data === "true";
                        }
                        break;

                        default:
                            this.#evoke_error();
                    }
                }
                break;

                case "num":
                {
                    const result = operands[0];
                    const value = operands[1];

                    result.obj.type = Object.typeof.number;

                    switch (value.obj.type)
                    {
                        case Object.typeof.bool:
                        case Object.typeof.number:
                        case Object.typeof.string:
                        {
                            result.obj.data = Number(value.obj.data);
                        }
                        break;

                        default:
                            this.#evoke_error();
                    }
                }
                break;

                case "str":
                {
                    const result = operands[0];
                    const value = operands[1];

                    result.obj.type = Object.typeof.string;

                    switch (op1.obj.type)
                    {
                        case Object.typeof.bool:
                        case Object.typeof.number:
                        case Object.typeof.string:
                        {
                            result.obj.data = String(value.obj.data);
                        }
                        break;

                        default:
                            this.#evoke_error();
                    }
                }
                break;

                case "or":
                {
                    const result = operands[0];
                    const op1 = operands[1];
                    const op2 = operands[2];

                    if (op1.obj.type !== Object.typeof.bool &&
                        op1.obj.type !== Object.typeof.number ||
                        op2.obj.type !== Object.typeof.bool &&
                        op2.obj.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    result.obj.type = Object.typeof.bool;
                    result.obj.data = op1.obj.data || op2.obj.data;
                }
                break;
                case "and":
                {
                    const result = operands[0];
                    const op1 = operands[1];
                    const op2 = operands[2];

                    if (op1.obj.type !== Object.typeof.bool &&
                        op1.obj.type !== Object.typeof.number ||
                        op2.obj.type !== Object.typeof.bool &&
                        op2.obj.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    result.obj.type = Object.typeof.bool;
                    result.obj.data = op1.obj.data && op2.obj.data;
                }
                break;

                case "|":
                {
                    const result = operands[0];
                    const op1 = operands[1];
                    const op2 = operands[2];

                    if (op1.obj.type !== Object.typeof.bool &&
                        op1.obj.type !== Object.typeof.number ||
                        op2.obj.type !== Object.typeof.bool &&
                        op2.obj.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    result.obj.type = Object.typeof.number;
                    result.obj.data = op1.obj.data | op2.obj.data;
                }
                break;
                case "^":
                {
                    const result = operands[0];
                    const op1 = operands[1];
                    const op2 = operands[2];

                    if (op1.obj.type !== Object.typeof.bool &&
                        op1.obj.type !== Object.typeof.number ||
                        op2.obj.type !== Object.typeof.bool &&
                        op2.obj.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    result.obj.type = Object.typeof.number;
                    result.obj.data = op1.obj.data ^ op2.obj.data;
                }
                break;
                case "&":
                {
                    const result = operands[0];
                    const op1 = operands[1];
                    const op2 = operands[2];

                    if (op1.obj.type !== Object.typeof.bool &&
                        op1.obj.type !== Object.typeof.number ||
                        op2.obj.type !== Object.typeof.bool &&
                        op2.obj.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    result.obj.type = Object.typeof.number;
                    result.obj.data = op1.obj.data & op2.obj.data;
                }
                break;

                case "==":
                {
                    const result = operands[0];
                    const op1 = operands[1];
                    const op2 = operands[2];

                    if (op1.obj.type !== Object.typeof.bool &&
                        op1.obj.type !== Object.typeof.number ||
                        op2.obj.type !== Object.typeof.bool &&
                        op2.obj.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    result.obj.type = Object.typeof.bool;
                    result.obj.data = op1.obj.data == op2.obj.data;
                }
                break;
                case "!=":
                {
                    const result = operands[0];
                    const op1 = operands[1];
                    const op2 = operands[2];

                    if (op1.obj.type !== Object.typeof.bool &&
                        op1.obj.type !== Object.typeof.number ||
                        op2.obj.type !== Object.typeof.bool &&
                        op2.obj.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    result.obj.type = Object.typeof.bool;
                    result.obj.data = op1.obj.data != op2.obj.data;
                }
                break;
                case "===":
                {
                    const result = operands[0];
                    const op1 = operands[1];
                    const op2 = operands[2];

                    if (op1.obj.type !== Object.typeof.bool &&
                        op1.obj.type !== Object.typeof.number ||
                        op2.obj.type !== Object.typeof.bool &&
                        op2.obj.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    result.obj.type = Object.typeof.bool;
                    result.obj.data = op1.obj.data === op2.obj.data;
                }
                break;
                case "!==":
                {
                    const result = operands[0];
                    const op1 = operands[1];
                    const op2 = operands[2];

                    if (op1.obj.type !== Object.typeof.bool &&
                        op1.obj.type !== Object.typeof.number ||
                        op2.obj.type !== Object.typeof.bool &&
                        op2.obj.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    result.obj.type = Object.typeof.bool;
                    result.obj.data = op1.obj.data !== op2.obj.data;
                }
                break;

                case "<":
                {
                    const result = operands[0];
                    const op1 = operands[1];
                    const op2 = operands[2];

                    if (op1.obj.type !== Object.typeof.bool &&
                        op1.obj.type !== Object.typeof.number ||
                        op2.obj.type !== Object.typeof.bool &&
                        op2.obj.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    result.obj.type = Object.typeof.bool;
                    result.obj.data = op1.obj.data < op2.obj.data;
                }
                break;
                case ">":
                {
                    const result = operands[0];
                    const op1 = operands[1];
                    const op2 = operands[2];

                    if (op1.obj.type !== Object.typeof.bool &&
                        op1.obj.type !== Object.typeof.number ||
                        op2.obj.type !== Object.typeof.bool &&
                        op2.obj.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    result.obj.type = Object.typeof.bool;
                    result.obj.data = op1.obj.data > op2.obj.data;
                }
                break;
                case "<=":
                {
                    const result = operands[0];
                    const op1 = operands[1];
                    const op2 = operands[2];

                    if (op1.obj.type !== Object.typeof.bool &&
                        op1.obj.type !== Object.typeof.number ||
                        op2.obj.type !== Object.typeof.bool &&
                        op2.obj.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    result.obj.type = Object.typeof.bool;
                    result.obj.data = op1.obj.data <= op2.obj.data;
                }
                break;
                case ">=":
                {
                    const result = operands[0];
                    const op1 = operands[1];
                    const op2 = operands[2];

                    if (op1.obj.type !== Object.typeof.bool &&
                        op1.obj.type !== Object.typeof.number ||
                        op2.obj.type !== Object.typeof.bool &&
                        op2.obj.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    result.obj.type = Object.typeof.bool;
                    result.obj.data = op1.obj.data >= op2.obj.data;
                }
                break;

                case "+":
                {
                    const result = operands[0];
                    const op1 = operands[1];
                    const op2 = operands[2];

                    if (op1.obj.type === Object.typeof.array &&
                        op2.obj.type === Object.typeof.array 
                    )
                    {
                        var array = structuredClone(op1.obj.data);
                        array.push(...structuredClone(op2.obj.data));
                        
                        result.obj.type = Object.typeof.array;
                        result.obj.data = array;

                        break;
                    }
                    if (op1.obj.type === Object.typeof.null ||
                        op2.obj.type === Object.typeof.null ||
                        op1.obj.type === Object.typeof.array ||
                        op2.obj.type === Object.typeof.array 
                    )
                    {
                        this.#evoke_error();
                    }

                    result.obj.type = Math.max(op1.obj.type, op2.obj.type);
                    result.obj.data = op1.obj.data + op2.obj.data;
                }
                break;
                case "-":
                {
                    const result = operands[0];
                    const op1 = operands[1];
                    const op2 = operands[2];

                    if (op1.obj.type !== Object.typeof.bool &&
                        op1.obj.type !== Object.typeof.number ||
                        op2.obj.type !== Object.typeof.bool &&
                        op2.obj.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }

                    result.obj.type = Object.typeof.number;
                    result.obj.data = op1.obj.data - op2.obj.data;
                }
                break;

                case "*":
                {
                    const result = operands[0];
                    const op1 = operands[1];
                    const op2 = operands[2];

                    if (op2.obj.type !== Object.typeof.number &&
                        op2.obj.type !== Object.typeof.bool ||
                        op1.obj.type === Object.typeof.null
                    )
                    {
                        this.#evoke_error();
                    }

                    if (op1.obj.type === Object.typeof.array)
                    {
                        var number = op2.obj.data;
                        if (op2.obj.type === Object.typeof.number) 
                        {
                            number = Math.trunc(number);
                        }
                        if (op2.obj.type === Object.typeof.bool) 
                        {
                            number = Number(number);
                        }

                        var array = [];
                        for (var count = 0; count < number; ++count)
                        {
                            array.push(...structuredClone(op1.obj.data));
                        }

                        result.obj.type = Object.typeof.array;
                        result.obj.data = array;

                        break;
                    }
                    if (op1.obj.type === Object.typeof.string)
                    {
                        var number = op2.obj.data;
                        if (op2.obj.type === Object.typeof.number) 
                        {
                            number = Math.trunc(number);
                        }
                        if (op2.obj.type === Object.typeof.bool)
                        {
                            number = Number(number);
                        }
                        
                        var string = "";
                        for (var count = 0; count < number; ++count)
                        {
                            string += op1.obj.data;
                        }

                        result.obj.type = Object.typeof.string;
                        result.obj.data = string;

                        break;
                    }

                    result.obj.type = Object.typeof.number;
                    result.obj.data = op1.obj.data * op2.obj.data;
                }
                break;
                case "/":
                {
                    const result = operands[0];
                    const op1 = operands[1];
                    const op2 = operands[2];

                    if (op1.obj.type !== Object.typeof.number ||
                        op2.obj.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (op2.obj.data == 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    result.obj.type = Object.typeof.number;
                    result.obj.data = op1.obj.data / op2.obj.data;
                }
                break;
                case "//":
                {
                    const result = operands[0];
                    const op1 = operands[1];
                    const op2 = operands[2];

                    if (op1.obj.type !== Object.typeof.number ||
                        op2.obj.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (op2.obj.data == 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    result.obj.type = Object.typeof.number;
                    result.obj.data = Math.trunc(op1.obj.data / op2.obj.data);
                }
                break;
                case "%":
                {
                    const result = operands[0];
                    const op1 = operands[1];
                    const op2 = operands[2];

                    if (op1.obj.type !== Object.typeof.number ||
                        op2.obj.type !== Object.typeof.number
                    )
                    {
                        this.#evoke_error();
                    }
                    if (op2.obj.data == 0)
                    {
                        throw new Error(`division by zero at (${position.row}, ${position.column})`);
                    }

                    result.obj.type = Object.typeof.number;
                    result.obj.data = op1.obj.data % op2.obj.data;
                }
                break;
            }

            // DEBUG

            console.log("after:");
            for (const op in operands)
            {
                if (operands[op].obj.type === Object.typeof.array)
                {
                    var res = op + ": array \t";
                    for (const element of operands[op].obj.data)
                    {
                        res += " " + element.obj.data
                    }
                    console.log(res);
                }
                else{
                    console.log(op + ": " + Object.data_name.get(operands[op].obj.type) + " \t" + operands[op].obj.data);
                }
            }

            // DEBUG

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