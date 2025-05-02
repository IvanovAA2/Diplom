
class Data
{
    type;
    data;

    static TYPEOF =
    {
        null        : 0,
        bool        : 1,
        number      : 2,
        string      : 3,
        array       : 4,

        function    : 5,

        sref        : 6,
        dref        : 7,

        jump        : 8,
    }

    static DATA_NAME = new Map
    ([
        [0, "null"],
        [1, "bool"],
        [2, "number"],
        [3, "string"],
        [4, "array"],

        [5, "func-n"],

        [6, "s-ref"],
        [7, "d-ref"],

        [8, "jump"],
    ])

    constructor (type, data)
    {
        this.type = type;
        this.data = data;
    }
}

class HeapData
{
    type;
    data;

    reference_count = 1;

    constructor (type, data)
    {
        this.type = type;
        this.data = data;
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

    static TYPEOF = {}
    static OPERATIONS =
    [
        "initialization",

        "function",
        "parameter",
        "return",
        "get_return",

        "if",
        "ifn",
        "jump",

        "create",

        "=",
        "+=",
        "-=",
        "*=",
        "/=",
        "//=",
        "%=",

        "or",
        "and",

        "|",
        "^",
        "&",

        "==",
        "!=",
        "===",
        "!==",

        "<",
        "<=",
        ">",
        ">=",

        "+",
        "-",

        "*",
        "/",
        "//",
        "%",
        
        "un-",
        "not",

        "array_access",
        "slice",

        "len",
        "push",
        "pop",
        "split",
        "join",
        "codeOfChar",

        "print",
        "println",
        "await",
        "input",
        "format",
        "clone",

        "is_null",
        "is_bool",
        "is_number",
        "is_string",
        "is_array",

        "to_bool",
        "to_number",
        "to_string",

        "exit",
    ]
    static OPERATION = [];
}

for (const INDEX in Operation.OPERATIONS)
{
    Operation.TYPEOF[Operation.OPERATIONS[INDEX]] = INDEX;
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

class Visitor
{
    static VISIT_RULE = {}

    function_memory = [];
    function_stack = [];
    
    scope_tree     = [new Scope(-1)];
    current_scope  = 0;
    
    operations;

    constructor (operations)
    {
        this.operations = operations;
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
            console.log(`incorrect rulename: ${NODE.rule_name}`)
        }
    }
}

class Program
{
    operations = [];
    
    current_operation;
    
    function_memory;

    stack;
    heap;
    free_memory;

    function_offset;
    parameter_stack;
    jump_back;
    return_value;

    time_start;
    overall_time;

    is_end;

    constructor (parse_tree) 
    {
        const VISITOR = new Visitor(this.operations);

        Visitor.VISIT_RULE["Program"](VISITOR, parse_tree, null);
    }

    run (first_run = true)
    {
        if (first_run)
        {
            this.current_operation  = 0;

            this.stack              = [];
            this.heap               = [];
            this.free_memory        = new Set();

            this.parameter_stack    = [];
            this.jump_back          = [];
            this.return_value       = new Data(undefined, undefined);

            this.overall_time       = 0;

            // DEBUG

            // var text = "", cnt = -1;

            // for (const OPERATION of this.operations)
            // {
            //     text += `${cnt += 1} \t${Operation.OPERATIONS[OPERATION.type]}: \t`;

            //     for (const OPERAND of OPERATION.operands)
            //     {
            //         if (OPERAND && OPERAND.hasOwnProperty("data"))
            //         {
            //             if (OPERAND.type === Data.TYPEOF.string)
            //             {
            //                 text += `(${Data.DATA_NAME.get(OPERAND.type)}: "${OPERAND.data})" `;
            //             }
            //             else if (OPERAND.type === Data.TYPEOF.array)
            //             {
            //                 text += `(${Data.DATA_NAME.get(OPERAND.type)}: [`;
                            
            //                 for (const ELEMENT of OPERAND.data)
            //                 {
            //                     text += `${ELEMENT.data} `;
            //                 }
                            
            //                 text += "\b] ";
            //             }
            //             else
            //             {
            //                 text += `(${Data.DATA_NAME.get(OPERAND.type)}: ${OPERAND.data}) `;
            //             }
            //         }
            //         else
            //         {
            //             text += OPERAND + " ";
            //         }
            //     }

            //     text += "\n";

            // }
            // console.log(text);

            // DEBUG
        }

        this.time_start = performance.now();
        this.is_end     = false;

        while (this.current_operation < this.operations.length && this.is_end === false)
        {
            // await new Promise(r => setTimeout(r, 200));

            const OPERATION = this.operations[this.current_operation];

            // DEBUG
            
            // var text = `!!!!!!!!!!!!!!!!!\n${this.current_operation} \t${Operation.OPERATIONS[OPERATION.type]} (${OPERATION.type}): `;
            // for (const OPERAND of OPERATION.operands)
            // {
            //     if (OPERAND && OPERAND.hasOwnProperty("data"))
            //     {
            //         if (OPERAND.type === Data.TYPEOF.string)
            //             {
            //                 text += `(${Data.DATA_NAME.get(OPERAND.type)}: "${OPERAND.data})" `;
            //             }
            //             else if (OPERAND.type === Data.TYPEOF.array)
            //             {
            //                 text += `(${Data.DATA_NAME.get(OPERAND.type)}: [ `;
                            
            //                 for (const ELEMENT of OPERAND.data)
            //                 {
            //                     text += `${ELEMENT.data} `;
            //                 }
                            
            //                 text += "] ";
            //             }
            //             else
            //             {
            //                 text += `(${Data.DATA_NAME.get(OPERAND.type)}: ${OPERAND.data}) `;
            //             }
            //     }
            //     else
            //     {
            //         text += OPERAND + " ";
            //     }
            // }
            // console.log(text);
            
            // DEBUG
            
            Operation.OPERATION[OPERATION.type](this, OPERATION.operands);

            this.current_operation += 1;
        }

        this.overall_time += performance.now() - this.time_start;
    }
}



Visitor.VISIT_RULE["Program"] = 
function (visitor, node, arg)
{
    const INITIALIZATION = create_operation(
        visitor, 
        get_operation("initialization"), 
        [null, null], 
        null
    );

    const JUMP = create_operation(
        visitor, 
        get_operation("jump"), 
        [new Data(Data.TYPEOF.jump, null)], 
        null
    );
    const FUNCTION_ID = open_function(visitor);

    if (length_is(node, 2))
    {
        visitor.visit(node, {}, 1);
    }

    close_function(visitor);

    visitor.operations[JUMP].operands[0].data =
    create_operation(
        visitor, 
        get_operation("function"), 
        [
            new Data(
                Data.TYPEOF.function, 
                [
                    JUMP + 1, 
                    FUNCTION_ID
                ]
            ), 
            []
        ], 
        null
    );

    create_operation(
        visitor, 
        get_operation("exit"), 
        [], 
        null
    );

    visitor.operations[INITIALIZATION].operands[0] = visitor.function_memory;
}
Visitor.VISIT_RULE["Statements"] = 
function (visitor, node, arg)
{
    visitor.visit(node, arg, 1);

    if (length_is(node, 2))
    {
        visitor.visit(node, arg, 2);
    }
}
Visitor.VISIT_RULE["Statement"] = 
function (visitor, node, arg)
{
    if (name_of(node, 1) === "Scope")
    {
        branch_scope(visitor);
        
        visitor.visit(node, arg, 1);
        
        leave_scope(visitor);
    }
    else
    {
        visitor.visit(node, arg, 1);
    }
}
Visitor.VISIT_RULE["Scope"] = 
function (visitor, node, arg)
{
    if (length_is(node, 3))
    {
        visitor.visit(node, arg, 2);
    }
}

Visitor.VISIT_RULE["Function"] = 
function (visitor, node, arg)
{
    const ID            = visitor.visit(node, null, 2);
    const FUNCTION      = create_function(visitor, ID.string);
    const FUNCTION_ID   = open_function(visitor);
    const JUMP          = create_operation(
        visitor, 
        get_operation("jump"), 
        [new Data(Data.TYPEOF.jump, null)], 
        null
    );
    
    branch_scope(visitor);
    
    if (length_is(node, 5))
    {
        visitor.visit(node, {}, 5);
    }
    else 
    {
        visitor.visit(node, null, 4);
        visitor.visit(node, {}, 6);
    }
    
    close_function(visitor);
    
    visitor.operations[JUMP].operands[0].data = 
    create_operation(
        visitor,
        get_operation("="),
        [
            FUNCTION, 
            new Data(
                Data.TYPEOF.function, 
                [
                    JUMP + 1, 
                    FUNCTION_ID
                ]
            )
        ],
        null
    );
    
    leave_scope(visitor);
}
Visitor.VISIT_RULE["FunctionParameters"] = 
function (visitor, node, arg)
{
    visitor.visit(node, null, 1);
    
    if (length_is(node, 2))
    {
        visitor.visit(node, null, 2);
    }
}
Visitor.VISIT_RULE["$FunctionParameters"] = 
function (visitor, node, arg)
{
    visitor.visit(node, null, 2);
    
    if (length_is(node, 3))
    {
        visitor.visit(node, null, 3);
    }
}
Visitor.VISIT_RULE["FunctionParameter"] = 
function (visitor, node, arg)
{
    const ID = visitor.visit(node, null, 1);
    
    create_variable(visitor, ID.string, ID.position);
    
    if (length_is(node, 1))
    {
        create_operation(
            visitor,  
            get_operation("parameter"),
            [
                get_variable(visitor, ID.string, ID.position),
                create_value(visitor, Data.TYPEOF.null, null)
            ],
            null
        );
    }
    if (length_is(node, 2))
    {
        create_operation(
            visitor,  
            get_operation("parameter"),
            [
                get_variable(visitor, ID.string, ID.position),
                visitor.visit(node, null, 2),
            ],
            null
        );
    }
}
Visitor.VISIT_RULE["$FunctionParameter"] = 
function (visitor, node, arg)
{
    return visitor.visit(node, null, 2);
}

Visitor.VISIT_RULE["BoolExpression"] = 
function (visitor, node, arg)
{
    const RESULT        = create_position(visitor);
    const EXPRESSION    = visitor.visit(node, null, 1);

    create_operation(
        visitor, 
        get_operation("to_bool"), 
        [RESULT, EXPRESSION], 
        null
    );
    
    return RESULT;
}
Visitor.VISIT_RULE["Conditional"] = 
function (visitor, node, arg)
{
    const ARG_COPY      = structuredClone(arg);
    const END_OF_IF     = $create_value(visitor, Data.TYPEOF.jump, null);
    ARG_COPY.END_OF_IF  = END_OF_IF.VALUE;
    
    visitor.visit(node, ARG_COPY, 1);
    
    if (length_is(node, 2))
    {
        visitor.visit(node, ARG_COPY, 2);
    }
    
    visitor.operations[END_OF_IF.OPERATION].operands[2] = next_operation(visitor);
}
Visitor.VISIT_RULE["$ElifBlock"] = 
function (visitor, node, arg)
{
    visitor.visit(node, arg, 1);
    
    if (length_is(node, 2))
    {
        visitor.visit(node, arg, 2);
    }
}
Visitor.VISIT_RULE["IfBlock"] = 
function (visitor, node, arg)
{
    const BOOL_EXPRESSION   = visitor.visit(node, arg, 3);
    const IF_JUMP           = create_operation(
        visitor, 
        get_operation("if"), 
        [BOOL_EXPRESSION, new Data(Data.TYPEOF.jump, null)], 
        null
    );
    
    branch_scope(visitor);
    visitor.visit(node, arg, 5)
    leave_scope(visitor);
    
    create_operation(
        visitor, 
        get_operation("jump"), 
        [arg.END_OF_IF], 
        null
    );
    
    visitor.operations[IF_JUMP].operands[1].data = next_operation(visitor);
}
Visitor.VISIT_RULE["ElifBlock"] = 
function (visitor, node, arg)
{
    const BOOL_EXPRESSION   = visitor.visit(node, arg, 3);
    const IF_JUMP           = create_operation(
        visitor, 
        get_operation("if"), 
        [BOOL_EXPRESSION, new Data(Data.TYPEOF.jump, null)], 
        null
    );
    
    branch_scope(visitor);
    visitor.visit(node, arg, 5)
    leave_scope(visitor);
    
    create_operation(
        visitor, 
        get_operation("jump"), 
        [arg.END_OF_IF], 
        null
    );
    
    visitor.operations[IF_JUMP].operands[1].data = next_operation(visitor);
}
Visitor.VISIT_RULE["ElseBlock"] = 
function (visitor, node, arg)
{
    branch_scope(visitor);
    visitor.visit(node, arg, 2);
    leave_scope(visitor);
}

Visitor.VISIT_RULE["Loop"] = 
function (visitor, node, arg)
{
    visitor.visit(node, arg, 1);
}
Visitor.VISIT_RULE["While"] = 
function (visitor, node, arg)
{
    const BREAK_JUMP        = $create_value(visitor, Data.TYPEOF.jump, null);
    const BEGIN             = next_operation(visitor); 
    const BOOL_EXPRESSION   = visitor.visit(node, null, 3);
    const CONTINUE_JUMP     = new Data(Data.TYPEOF.jump, BEGIN);
    
    create_operation(
        visitor, 
        get_operation("if"), 
        [BOOL_EXPRESSION, BREAK_JUMP.VALUE], 
        null
    );
    
    const ARG_COPY = structuredClone(arg);
    ARG_COPY.BREAK = BREAK_JUMP.VALUE;
    ARG_COPY.CONTINUE = CONTINUE_JUMP;
    
    branch_scope(visitor);
    visitor.visit(node, ARG_COPY, 5);
    leave_scope(visitor);
    
    create_operation(
        visitor, 
        get_operation("jump"), 
        [CONTINUE_JUMP], 
        null
    );
    
    visitor.operations[BREAK_JUMP.OPERATION].operands[2] = next_operation(visitor);
}
Visitor.VISIT_RULE["For"] = 
function (visitor, node, arg)
{
    branch_scope(visitor);
    
    visitor.visit(node, null, 3);
    const BREAK_JUMP = $create_value(visitor, Data.TYPEOF.jump, null);
    
    const FIRST_JUMP = create_operation(
        visitor, 
        get_operation("jump"), 
        [new Data(Data.TYPEOF.jump, null)], 
        null
    );
    
    const BEGIN = next_operation(visitor); 
    
    visitor.visit(node, null, 7);
    
    visitor.operations[FIRST_JUMP].operands[0].data = next_operation(visitor);
    
    const BOOL_EXPRESSION   = visitor.visit(node, null, 5);
    const CONTINUE_JUMP     = new Data(Data.TYPEOF.jump, BEGIN);
    
    create_operation(
        visitor, 
        get_operation("if"), 
        [BOOL_EXPRESSION, BREAK_JUMP.VALUE], 
        null
    );
    
    const ARG_COPY      = structuredClone(arg);
    ARG_COPY.BREAK      = BREAK_JUMP.VALUE;
    ARG_COPY.CONTINUE   = CONTINUE_JUMP;
    
    visitor.visit(node, ARG_COPY, 9);
    
    create_operation(
        visitor, 
        get_operation("jump"), 
        [CONTINUE_JUMP], 
        null
    );
    
    leave_scope(visitor);
    
    visitor.operations[BREAK_JUMP.OPERATION].operands[2] = next_operation(visitor);
}
Visitor.VISIT_RULE["ExpressionOrDeclaration"] = 
function (visitor, node, arg)
{
    visitor.visit(node, null, 1);
}
Visitor.VISIT_RULE["FlowControl"] = 
function (visitor, node, arg)
{
    const NAME = name_of(node, 1);

    switch (NAME)
    {
        case "continue":
        {
            create_operation(
                visitor, 
                get_operation("jump"), 
                [arg.CONTINUE], 
                null
            );
        }
        break;
        case "break":
        {
            create_operation(
                visitor, 
                get_operation("jump"), 
                [arg.BREAK], 
                null
            );
        }
        break;
        case "return":
        {
            if (length_is(node, 3))
            {
                create_operation(
                    visitor, 
                    get_operation("return"), 
                    [visitor.visit(node, null, 2)], 
                    null
                );
            }
            if (length_is(node, 2))
            {
                create_operation(
                    visitor, 
                    get_operation("return"), 
                    [create_value(visitor, Data.TYPEOF.null, null)], 
                    null
                );
            }
        }
        break;
    }
}

Visitor.VISIT_RULE["Declaration"] = 
function (visitor, node, arg)
{
    visitor.visit(node, null, 2);

    if (length_is(node, 3))
    {
        visitor.visit(node, null, 3);
    }
}
Visitor.VISIT_RULE["$Declaration"] =
function (visitor, node, arg)
{
    visitor.visit(node, null, 2);

    if (length_is(node, 3))
    {
        visitor.visit(node, null, 3);
    }
}
Visitor.VISIT_RULE["SingleDeclaration"] = 
function (visitor, node, arg)
{
    const VARIABLE = visitor.visit(node, null, 1);
    create_variable(visitor, VARIABLE.string, VARIABLE.position);

    if (length_is(node, 2))
    {
        create_operation(
            visitor,
            get_operation("="),
            [
                get_variable(
                    visitor,
                    VARIABLE.string,
                    VARIABLE.position
                ),
                visitor.visit(node, null, 2)
            ],
            null
        );
    }
}
Visitor.VISIT_RULE["$SingleDeclaration"] =
function (visitor, node, arg)
{
    return visitor.visit(node, null, 2);;
}

Visitor.VISIT_RULE["Expressions"] = 
function (visitor, node, arg)
{
    visitor.visit(node, null, 1);

    if (length_is(node, 2))
    {
        visitor.visit(node, null, 2);
    }
}
Visitor.VISIT_RULE["$Expressions"] =
function (visitor, node, arg)
{
    if (length_is(node, 3))
    {
        visitor.visit(node, null, 2);
        visitor.visit(node, null, 3);
    }
}
Visitor.VISIT_RULE["Expression"] = 
function (visitor, node, arg)
{
    return visitor.visit(node, null, 1);
}
Visitor.VISIT_RULE["$Expression"] =
function (visitor, node, arg)
{
    return visitor.visit(node, null, 1);
}

Visitor.VISIT_RULE["AssignOp"] = 
function (visitor, node, arg)
{
    const LEFT = visitor.visit(node, null, 1);

    if (length_is(node, 1))
    {
        return LEFT;
    }

    return visitor.visit(node, LEFT, 2);
}
Visitor.VISIT_RULE["$AssignOp"] = 
function (visitor, node, arg)
{
    const LEFT  = arg;
    const RIGHT = visitor.visit(node, null, 2);

    create_operation(
        visitor, 
        get_operation(node, 1), 
        [LEFT, RIGHT], 
        get_position(node, 1)
    );

    return LEFT;
}

Visitor.VISIT_RULE["BoolOr"] = 
function (visitor, node, arg)
{
    const LEFT = visitor.visit(node, null, 1);

    if (length_is(node, 1))
    {
        return LEFT;
    }

    return visitor.visit(node, LEFT, 2);
}
Visitor.VISIT_RULE["$BoolOr"] = 
function (visitor, node, arg)
{
    const RESULT    = create_position(visitor);
    const LEFT      = arg;
    
    const JUMP = create_operation(
        visitor, 
        get_operation("ifn"), 
        [LEFT, new Data(Data.TYPEOF.jump, null)], 
        get_position(node, 1)
    );
    
    const RIGHT = visitor.visit(node, null, 2);
    
    visitor.operations[JUMP].operands[1].data = 
    next_operation(visitor);

    create_operation(
        visitor, 
        get_operation("or"), 
        [RESULT, LEFT, RIGHT], 
        get_position(node, 1)
    );

    if (length_is(node, 2))
    {
        return RESULT;
    }
    
    return visitor.visit(node, RESULT, 3);
}
Visitor.VISIT_RULE["BoolAnd"] = 
function (visitor, node, arg)
{
    const LEFT = visitor.visit(node, null, 1);

    if (length_is(node, 1))
    {
        return LEFT;
    }

    return visitor.visit(node, LEFT, 2);
}
Visitor.VISIT_RULE["$BoolAnd"] = 
function (visitor, node, arg)
{
    const RESULT    = create_position(visitor);
    const LEFT      = arg;
    
    const JUMP = create_operation(
        visitor, 
        get_operation("if"), 
        [LEFT, new Data(Data.TYPEOF.jump, null)], 
        get_position(node, 1)
    );
    
    const RIGHT = visitor.visit(node, null, 2);
    
    visitor.operations[JUMP].operands[1].data = 
    next_operation(visitor);

    create_operation(
        visitor, 
        get_operation("and"), 
        [RESULT, LEFT, RIGHT], 
        get_position(node, 1)
    );

    if (length_is(node, 2))
    {
        return RESULT;
    }
    
    return visitor.visit(node, RESULT, 3);
}

Visitor.VISIT_RULE["BitOr"] = 
function (visitor, node, arg)
{
    const LEFT = visitor.visit(node, null, 1);

    if (length_is(node, 1))
    {
        return LEFT;
    }

    return visitor.visit(node, LEFT, 2);
}
Visitor.VISIT_RULE["$BitOr"] =
function (visitor, node, arg)
{
    const RESULT    = create_position(visitor);
    const LEFT      = arg;
    const RIGHT     = visitor.visit(node, null, 2);

    create_operation(
        visitor, 
        get_operation(node, 1), 
        [RESULT, LEFT, RIGHT], 
        get_position(node, 1)
    );

    if (length_is(node, 2))
    {
        return RESULT;
    }
    
    return visitor.visit(node, RESULT, 3)
}
Visitor.VISIT_RULE["BitXor"] = 
function (visitor, node, arg)
{
    const LEFT = visitor.visit(node, null, 1);

    if (length_is(node, 1))
    {
        return LEFT;
    }

    return visitor.visit(node, LEFT, 2);
}
Visitor.VISIT_RULE["$BitXor"] = 
function (visitor, node, arg)
{
    const RESULT    = create_position(visitor);
    const LEFT      = arg;
    const RIGHT     = visitor.visit(node, null, 2);

    create_operation(
        visitor, 
        get_operation(node, 1), 
        [RESULT, LEFT, RIGHT], 
        get_position(node, 1)
    );

    if (length_is(node, 2))
    {
        return RESULT;
    }
    
    return visitor.visit(node, RESULT, 3)
}
Visitor.VISIT_RULE["BitAnd"] = 
function (visitor, node, arg)
{
    const LEFT = visitor.visit(node, null, 1);

    if (length_is(node, 1))
    {
        return LEFT;
    }

    return visitor.visit(node, LEFT, 2);
}
Visitor.VISIT_RULE["$BitAnd"] =
function (visitor, node, arg)
{
    const RESULT    = create_position(visitor);
    const LEFT      = arg;
    const RIGHT     = visitor.visit(node, null, 2);

    create_operation(
        visitor, 
        get_operation(node, 1), 
        [RESULT, LEFT, RIGHT], 
        get_position(node, 1)
    );

    if (length_is(node, 2))
    {
        return RESULT;
    }
    
    return visitor.visit(node, RESULT, 3)
}

Visitor.VISIT_RULE["EqualOp"] = 
function (visitor, node, arg)
{
    const LEFT = visitor.visit(node, null, 1);

    if (length_is(node, 1))
    {
        return LEFT;
    }

    return visitor.visit(node, LEFT, 2);
}
Visitor.VISIT_RULE["$EqualOp"] = 
function (visitor, node, arg)
{
    const RESULT    = create_position(visitor);
    const LEFT      = arg;
    const RIGHT     = visitor.visit(node, null, 2);

    create_operation(
        visitor, 
        get_operation(node, 1), 
        [RESULT, LEFT, RIGHT], 
        get_position(node, 1)
    );

    if (length_is(node, 2))
    {
        return RESULT;
    }
    
    return visitor.visit(node, RESULT, 3)
}

Visitor.VISIT_RULE["CompOp"] = 
function (visitor, node, arg)
{
    const LEFT = visitor.visit(node, null, 1);

    if (length_is(node, 1))
    {
        return LEFT;
    }

    return visitor.visit(node, LEFT, 2);
}
Visitor.VISIT_RULE["$CompOp"] = 
function (visitor, node, arg)
{
    const RESULT    = create_position(visitor);
    const LEFT      = arg;
    const RIGHT     = visitor.visit(node, null, 2);

    create_operation(
        visitor, 
        get_operation(node, 1), 
        [RESULT, LEFT, RIGHT], 
        get_position(node, 1)
    );

    if (length_is(node, 2))
    {
        return RESULT;
    }
    
    return visitor.visit(node, RESULT, 3)
}

Visitor.VISIT_RULE["AddOp"] = 
function (visitor, node, arg)
{
    const LEFT = visitor.visit(node, null, 1);

    if (length_is(node, 1))
    {
        return LEFT;
    }

    return visitor.visit(node, LEFT, 2);
}
Visitor.VISIT_RULE["$AddOp"] = 
function (visitor, node, arg)
{
    const RESULT    = create_position(visitor);
    const LEFT      = arg;
    const RIGHT     = visitor.visit(node, null, 2);

    create_operation(
        visitor, 
        get_operation(node, 1), 
        [RESULT, LEFT, RIGHT], 
        get_position(node, 1)
    );

    if (length_is(node, 2))
    {
        return RESULT;
    }
    
    return visitor.visit(node, RESULT, 3)
}

Visitor.VISIT_RULE["MulOp"] = 
function (visitor, node, arg)
{
    const LEFT = visitor.visit(node, null, 1);

    if (length_is(node, 1))
    {
        return LEFT;
    }

    return visitor.visit(node, LEFT, 2);
}
Visitor.VISIT_RULE["$MulOp"] = 
function (visitor, node, arg)
{
    const RESULT    = create_position(visitor);
    const LEFT      = arg;
    const RIGHT     = visitor.visit(node, null, 2);

    create_operation(
        visitor, 
        get_operation(node, 1), 
        [RESULT, LEFT, RIGHT], 
        get_position(node, 1)
    );

    if (length_is(node, 2))
    {
        return RESULT;
    }
    
    return visitor.visit(node, RESULT, 3);
}

Visitor.VISIT_RULE["UnaryOp"] = 
function (visitor, node, arg)
{
    const NAME      = name_of(node, 1);
    const RESULT    = create_position(visitor);
    const VALUE     = visitor.visit(node, null, 2);
    
    switch (NAME)
    {
        case "-":
        {
            create_operation(
                visitor, 
                get_operation("un-"), 
                [RESULT, VALUE], 
                get_position(node, 1)
            );
        }
        break;
        
        case "not":
        {
            create_operation(
                visitor, 
                get_operation("not"), 
                [RESULT, VALUE], 
                get_position(node, 1)
            );
        }
        break;
    }
    
    return RESULT;
}

Visitor.VISIT_RULE["$Value"] = 
function (visitor, node, arg)
{
    const VALUE = visitor.visit(node, null, 1);

    if (length_is(node, 1))
    {
        return VALUE;
    }

    return visitor.visit(node, VALUE, 2);
}
Visitor.VISIT_RULE["Accessing"] = 
function (visitor, node, arg)
{
    const OBJECT = visitor.visit(node, arg, 1);

    if (length_is(node, 1))
    {
        return OBJECT;
    }
    
    return visitor.visit(node, OBJECT, 2);
}
Visitor.VISIT_RULE["SingleAccessing"] = 
function (visitor, node, arg)
{
    if (length_is(node, 2))
    {
        return visitor.visit(node, arg, 2);
    }
    if (length_is(node, 3))
    {
        const ELEMENT   = create_position(visitor);
        const ARRAY     = arg;
        const INDEX     = visitor.visit(node, null, 2);
        
        create_operation(
            visitor, 
            get_operation("array_access"),
            [ELEMENT, ARRAY, INDEX],
            get_position(node, 1)
        );

        return ELEMENT;
    }
    if (length_is(node, 4))
    {
        const SLICE     = create_position(visitor);
        const SEQUENCE  = arg;
        const BEGIN     = visitor.visit(node, null, 2);
        const END       = visitor.visit(node, null, 3);
        
        create_operation(
            visitor, 
            get_operation("array_access"),
            [SLICE, SEQUENCE, BEGIN, END],
            get_position(node, 1)
        );

        return SLICE;
    }
}
Visitor.VISIT_RULE["Slice"] = 
function (visitor, node, arg)
{
    return visitor.visit(node, null, 2);
}
Visitor.VISIT_RULE["MemberAccessing"] = 
function (visitor, node, arg)
{
    const OBJECT    = arg;
    const NAME      = name_of(node, 1); 
    const POSITION  = get_position(node, 1); 
    
    switch (NAME)
    {
        case "len":
        {
            const RESULT = create_position(visitor);
            
            create_operation(
                visitor,
                get_operation("len"),
                [RESULT, OBJECT],
                POSITION
            );
            
            return RESULT;
        }
        break;
        
        case "push":
        {
            const VALUE = visitor.visit(node, null, 3);
            
            create_operation(
                visitor,
                get_operation("push"),
                [OBJECT, VALUE],
                POSITION
            );
            
            return create_value(visitor, Data.TYPEOF.null, null);
        }
        break;
        case "pop":
        {
            const RESULT = create_position(visitor);
            
            create_operation(
                visitor,
                get_operation("pop"),
                [RESULT, OBJECT],
                POSITION
            );
            
            return RESULT;
        }
        break;
        
        case "split":
        {
            const ARRAY         = create_position(visitor);
            const STRING        = OBJECT;
            const DELIMETER     = visitor.visit(node, null, 3);
            
            create_operation(
                visitor,
                get_operation("split"),
                [ARRAY, STRING, DELIMETER],
                POSITION
            );
            
            return ARRAY;
        }
        break;
        case "join":
        {
            const STRING        = create_position(visitor);
            const ARRAY         = OBJECT;
            const DELIMETER     = visitor.visit(node, null, 3);
            
            create_operation(
                visitor,
                get_operation("join"),
                [STRING, ARRAY, DELIMETER],
                POSITION
            );
            
            return STRING;
        }
        break;
        
        case "codeOfChar":
        {
            const RESULT    = create_position(visitor);
            const INDEX     = visitor.visit(node, null, 3);
            
            create_operation(
                visitor,
                get_operation("codeOfChar"),
                [RESULT, OBJECT, INDEX],
                POSITION
            );
            
            return RESULT;
        }
        break;
    }
}

Visitor.VISIT_RULE["Value"] = 
function (visitor, node, arg)
{
    if (length_is(node, 1))
    {
        return visitor.visit(node, null, 1); 
    }

    return visitor.visit(node, null, 2); 
}

Visitor.VISIT_RULE["VariableOrFunctionCall"] = 
function (visitor, node, arg)
{
    const ID = visitor.visit(node, null, 1);
    
    if (length_is(node, 1))
    {
        return get_variable(visitor, ID.string, ID.position);
    }
    
    return visitor.visit(node, ID, 2);
}
Visitor.VISIT_RULE["id"] = 
function (visitor, node, arg)
{
    return node.children; 
}

Visitor.VISIT_RULE["FunctionCall"] = 
function (visitor, node, arg)
{
    const PARAMETERS    = [];
    const ID            = arg;
    
    if (length_is(node, 3))
    {
        visitor.visit(node, PARAMETERS, 2);
    }
    
    create_operation(
        visitor, 
        get_operation("function"), 
        [
            get_function(
                visitor,
                ID.string,
                ID.position
            ), 
            PARAMETERS
        ], 
        null
    );
    
    const RETURN_VALUE = create_position(visitor);
    create_operation(
        visitor, 
        get_operation("get_return"), 
        [RETURN_VALUE], 
        null
    );
    
    return RETURN_VALUE;
}
Visitor.VISIT_RULE["DefaultFunctionCall"] = 
function (visitor, node, arg)
{
    const NAME = name_of(node, 1);

    switch (NAME)
    {
        case "is_null":
        {
            const RESULT    = create_position(visitor);
            const VALUE     = visitor.visit(node, null, 3);

            create_operation(
                visitor, 
                get_operation("is_null"), 
                [RESULT, VALUE], 
                get_position(node, 1)
            );

            return RESULT;
        }
        break;
        case "is_bool":
        {
            const RESULT    = create_position(visitor);
            const VALUE     = visitor.visit(node, null, 3);

            create_operation(
                visitor, 
                get_operation("is_bool"), 
                [RESULT, VALUE], 
                get_position(node, 1)
            );

            return RESULT;
        }
        break;
        case "is_number":
        {
            const RESULT    = create_position(visitor);
            const VALUE     = visitor.visit(node, null, 3);

            create_operation(
                visitor, 
                get_operation("is_number"), 
                [RESULT, VALUE], 
                get_position(node, 1)
            );

            return RESULT;
        }
        break;
        case "is_string":
        {
            const RESULT    = create_position(visitor);
            const VALUE     = visitor.visit(node, null, 3);

            create_operation(
                visitor, 
                get_operation("is_string"), 
                [RESULT, VALUE], 
                get_position(node, 1)
            );

            return RESULT;
        }
        break;
        case "is_array":
        {
            const RESULT    = create_position(visitor);
            const VALUE     = visitor.visit(node, null, 3);

            create_operation(
                visitor, 
                get_operation("is_array"), 
                [RESULT, VALUE], 
                get_position(node, 1)
            );

            return RESULT;
        }
        break;
        
        case "print":
        {
            const PARAMETERS = [];

            if (length_is(node, 4))
            {
                visitor.visit(node, PARAMETERS, 3);
            }

            create_operation(
                visitor, 
                get_operation("print"), 
                PARAMETERS, 
                get_position(node, 1)
            );

            return create_value(visitor, Data.TYPEOF.null, null);
        }
        break;
        case "println":
        {
            const PARAMETERS = [];

            if (length_is(node, 4))
            {
                visitor.visit(node, PARAMETERS, 3);
            }

            create_operation(
                visitor, 
                get_operation("println"), 
                PARAMETERS, 
                get_position(node, 1)
            );

            return create_value(visitor, Data.TYPEOF.null, null);
        }
        break;
        case "input":
        {
            if (length_is(node, 4))
            {
                var HINT_TEXT = visitor.visit(node, null, 3);
            }
            if (length_is(node, 3))
            {
                var HINT_TEXT = create_value(visitor, Data.TYPEOF.string, "");
            }

            create_operation(
                visitor, 
                get_operation("await"), 
                [HINT_TEXT], 
                get_position(node, 1)
            );
            const INPUT = create_position(visitor);
            create_operation(
                visitor, 
                get_operation("input"), 
                [INPUT], 
                get_position(node, 1)
            );

            return INPUT;
        }
        break;
        
        case "format":
        {
            const RESULT    = create_position(visitor);
            const VALUE     = visitor.visit(node, null, 3);

            create_operation(
                visitor, 
                get_operation("format"), 
                [RESULT, VALUE], 
                get_position(node, 1)
            );

            return RESULT;
        }
        break;
        
        case "clone":
        {
            const RESULT    = create_position(visitor);
            const VALUE     = visitor.visit(node, null, 3);

            create_operation(
                visitor, 
                get_operation("clone"), 
                [RESULT, VALUE], 
                get_position(node, 1)
            );

            return RESULT;
        }
        break;
    }
}

Visitor.VISIT_RULE["Parameters"] = 
function (visitor, node, arg)
{
    const PARAMETERS = arg;
    PARAMETERS.push(visitor.visit(node, null, 1));
    
    if (length_is(node, 2))
    {
        visitor.visit(node, PARAMETERS, 2);
    }
}
Visitor.VISIT_RULE["$Parameters"] = 
function (visitor, node, arg)
{
    const PARAMETERS = arg;
    PARAMETERS.push(visitor.visit(node, null, 2));

    if (length_is(node, 3))
    {
        visitor.visit(node, PARAMETERS, 3);
    }
}
Visitor.VISIT_RULE["ReverseParameters"] = 
function (visitor, node, arg)
{
    const PARAMETERS = arg;
    if (length_is(node, 2))
    {
        visitor.visit(node, PARAMETERS, 2);
    }
    
    PARAMETERS.push(visitor.visit(node, null, 1));
}
Visitor.VISIT_RULE["$ReverseParameters"] = 
function (visitor, node, arg)
{
    const PARAMETERS = arg;
    if (length_is(node, 3))
    {
        visitor.visit(node, PARAMETERS, 3);
    }
    
    PARAMETERS.push(visitor.visit(node, null, 2));
}

Visitor.VISIT_RULE["Null"] = 
function (visitor, node, arg)
{
    return create_value(visitor, Data.TYPEOF.null, null);
}
Visitor.VISIT_RULE["Boolean"] = 
function (visitor, node, arg)
{
    return visitor.visit(node, null, 1); 
}
Visitor.VISIT_RULE["Boolean"] = 
function (visitor, node, arg)
{
    if (length_is(node, 1))
    {
        return visitor.visit(node, null, 1); 
        
    }

    const RESULT    = create_position(visitor);
    const VALUE     = visitor.visit(node, null, 3); 

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
        return visitor.visit(node, null, 1); 
    }
    
    const RESULT    = create_position(visitor);
    const VALUE     = visitor.visit(node, null, 3); 

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
        return visitor.visit(node, null, 1); 
    }
    
    const RESULT    = create_position(visitor);
    const VALUE     = visitor.visit(node, null, 3); 
    
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
    ARRAY.push(visitor.visit(node, null, 1));

    if (length_is(node, 2))
    {
        visitor.visit(node, ARRAY, 2);
    }
}
Visitor.VISIT_RULE["$$Array"] = 
function (visitor, node, arg)
{
    const ARRAY = arg;
    ARRAY.push(visitor.visit(node, null, 2));

    if (length_is(node, 3))
    {
        visitor.visit(node, ARRAY, 3);
    }
}


Operation.OPERATION[Operation.TYPEOF["initialization"]] =
function (program, operands)
{
    const LENGTH = operands[0].length;
    program.function_offset = Array.from({length: LENGTH}, () => []);
    
    program.function_memory = operands[0];
}

Operation.OPERATION[Operation.TYPEOF["function"]] =
function (program, operands)
{
    const FUNC = get(program, operands[0]).data;
    
    const PARAMETERS = structuredClone(operands[1]);
    for (var index in PARAMETERS)
    {
        PARAMETERS[index] = sget(program, PARAMETERS[index]);
    }
    program.parameter_stack.push(PARAMETERS);
    
    program.function_offset[FUNC[1]].push(program.stack.length);
    program.jump_back.push([program.current_operation + 1, FUNC[1]]);
    for (var i = 0; i < program.function_memory[FUNC[1]]; i += 1)
    {
        program.stack.push(new Data(Data.TYPEOF.null, null));
    }
    
    program.current_operation = FUNC[0] - 1;
}
Operation.OPERATION[Operation.TYPEOF["parameter"]] =
function (program, operands)
{
    const PARAMETERS    = program.parameter_stack.at(-1);
    const PARAMETER     = sget(program, operands[0]);
    
    if (PARAMETERS.length > 0)
    {
        allocate_from(program, PARAMETER, PARAMETERS.pop());
    }
    else
    {
        allocate_from(program, PARAMETER, operands[1]);
    }
}
Operation.OPERATION[Operation.TYPEOF["return"]] =
function (program, operands)
{
    const VALUE = sget(program, operands[0]);

    program.return_value.type = VALUE.type;
    program.return_value.data = VALUE.data;

    if (VALUE.type === Data.TYPEOF.dref)
    {
        program.heap[VALUE.data].reference_count += 1;
    }
    
    const FUNCTION_ID = program.jump_back.at(-1)[1];
    const NEW_SIZE = program.function_offset[FUNCTION_ID].pop();
    program.current_operation = program.jump_back.at(-1)[0] - 1;
    for (var position = NEW_SIZE; position < program.stack.length; position += 1)
    {
        deallocate(program, program.stack[position]);
    }
    program.stack.length = NEW_SIZE;

    program.jump_back.pop();
    program.parameter_stack.pop();
}
Operation.OPERATION[Operation.TYPEOF["get_return"]] =
function (program, operands)
{
    const RESULT        = sget(program, operands[0]);
    const RETURN_VALUE  = program.return_value;
    
    deallocate(program, RESULT);
    
    RESULT.type = RETURN_VALUE.type;
    RESULT.data = RETURN_VALUE.data;
}

Operation.OPERATION[Operation.TYPEOF["if"]] =
function (program, operands)
{
    const BOOL_EXPRESSION   = get(program, operands[0]);
    const JUMP              = get(program, operands[1]);
    
    if (BOOL_EXPRESSION.data === false)
    {
        program.current_operation = JUMP.data - 1;
    }
}
Operation.OPERATION[Operation.TYPEOF["ifn"]] =
function (program, operands)
{
    const BOOL_EXPRESSION   = get(program, operands[0]);
    const JUMP              = get(program, operands[1]);
    
    if (BOOL_EXPRESSION.data === true)
    {
        program.current_operation = JUMP.data - 1;
    }
}
Operation.OPERATION[Operation.TYPEOF["jump"]] =
function (program, operands)
{
    const JUMP = get(program, operands[0]);

    program.current_operation = JUMP.data - 1;
}

Operation.OPERATION[Operation.TYPEOF["create"]] =
function (program, operands)
{
    const POSITION  = operands[0];
    const OFFSET    = program.function_offset[POSITION[0]].at(-1);

     allocate(
        program, 
        program.stack[OFFSET + POSITION[1]],
        operands[1], 
        operands[2]
    );
}

Operation.OPERATION[Operation.TYPEOF["="]] =
function (program, operands)
{
    const OBJECT    = operands[0];
    const VALUE     = operands[1];

    allocate_from(program, OBJECT, VALUE);
}
Operation.OPERATION[Operation.TYPEOF["+="]] =
function (program, operands)
{
    const OBJECT    = get(program, operands[0]);
    const VALUE     = get(program, operands[1]);

    if (OBJECT.type === Data.TYPEOF.null ||
        OBJECT.type === Data.TYPEOF.array ||
        VALUE.type === Data.TYPEOF.null ||
        VALUE.type === Data.TYPEOF.array
    )
    {
        evoke_error(program);
    }

    if (OBJECT.type === Data.TYPEOF.string ||
        VALUE.type === Data.TYPEOF.string
    )
    {
        OBJECT.type = Data.TYPEOF.string;
    }
    else
    {
        OBJECT.type = Data.TYPEOF.number;
    }
    OBJECT.data += VALUE.data;
}
Operation.OPERATION[Operation.TYPEOF["-="]] =
function (program, operands)
{
    const OBJECT    = get(program, operands[0]);
    const VALUE     = get(program, operands[1]);

    if (OBJECT.type !== Data.TYPEOF.number &&
        OBJECT.type !== Data.TYPEOF.bool ||
        VALUE.type !== Data.TYPEOF.number &&
        VALUE.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program);
    }

    OBJECT.type = Data.TYPEOF.number;
    OBJECT.data -= VALUE.data;
}
Operation.OPERATION[Operation.TYPEOF["*="]] =
function (program, operands)
{
    const OBJECT    = get(program, operands[0]);
    const VALUE     = get(program, operands[1]);
    
    if (OBJECT.type === Data.TYPEOF.string)
    {
        if (VALUE.type !== Data.TYPEOF.number)
        {
            evoke_error(program);
        }
        
        OBJECT.data = OBJECT.data.repeat(VALUE.data);
        
        return;
    }
    if (OBJECT.type === Data.TYPEOF.array)
    {
        if (VALUE.type !== Data.TYPEOF.number)
        {
            evoke_error(program);
        }
        
        const ARRAY = [];
        for (var i = 0; i < VALUE.data; i += 1)
        {
            for (const ELEMENT of OBJECT.data)
            {
                const DREF      = sget(program, ELEMENT); 
                const MIDPOINT  = new Data(Data.TYPEOF.null, null);
                
                allocate_from(program, MIDPOINT, DREF);
                
                ARRAY.push(MIDPOINT);
                
                program.heap[DREF.data].reference_count += 1;
            }
        }
        
        allocate(
            program,
            OBJECT,
            Data.TYPEOF.array, 
            ARRAY
        );
        
        return;
    }

    if (OBJECT.type !== Data.TYPEOF.number &&
        OBJECT.type !== Data.TYPEOF.bool ||
        VALUE.type !== Data.TYPEOF.number &&
        VALUE.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program);
    }

    OBJECT.type = Data.TYPEOF.number;
    OBJECT.data *= VALUE.data;
}
Operation.OPERATION[Operation.TYPEOF["/="]] =
function (program, operands)
{
    const OBJECT    = get(program, operands[0]);
    const VALUE     = get(program, operands[1]);

    if (OBJECT.type !== Data.TYPEOF.number &&
        OBJECT.type !== Data.TYPEOF.bool ||
        VALUE.type !== Data.TYPEOF.number &&
        VALUE.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program);
    }

    OBJECT.type = Data.TYPEOF.number;
    OBJECT.data /= VALUE.data;
}
Operation.OPERATION[Operation.TYPEOF["//="]] =
function (program, operands)
{
    const OBJECT    = get(program, operands[0]);
    const VALUE     = get(program, operands[1]);

    if (OBJECT.type !== Data.TYPEOF.number &&
        OBJECT.type !== Data.TYPEOF.bool ||
        VALUE.type !== Data.TYPEOF.number &&
        VALUE.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program);
    }

    OBJECT.type = Data.TYPEOF.number;
    OBJECT.data = Math.trunc(OBJECT.data / VALUE.data);
}
Operation.OPERATION[Operation.TYPEOF["%="]] =
function (program, operands)
{
    const OBJECT    = get(program, operands[0]);
    const VALUE     = get(program, operands[1]);

    if (OBJECT.type !== Data.TYPEOF.number &&
        OBJECT.type !== Data.TYPEOF.bool ||
        VALUE.type !== Data.TYPEOF.number &&
        VALUE.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program);
    }

    OBJECT.type = Data.TYPEOF.number;
    OBJECT.data %= VALUE.data;
}

Operation.OPERATION[Operation.TYPEOF["or"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);
    
    if (to_bool(program, LEFT) === true)
    {
        allocate(
            program,
            RESULT,
            Data.TYPEOF.bool, 
            true
        );
    }
    else
    {
        allocate(
            program,
            RESULT,
            Data.TYPEOF.bool, 
            to_bool(program, RIGHT)
        );
    }
}
Operation.OPERATION[Operation.TYPEOF["and"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (to_bool(program, LEFT) === false)
    {
        allocate(
            program,
            RESULT,
            Data.TYPEOF.bool, 
            false
        );
    }
    else
    {
        allocate(
            program,
            RESULT,
            Data.TYPEOF.bool, 
            to_bool(program, RIGHT)
        );
    }
}

Operation.OPERATION[Operation.TYPEOF["|"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type !== Data.TYPEOF.number &&
        LEFT.type !== Data.TYPEOF.bool ||
        RIGHT.type !== Data.TYPEOF.number &&
        RIGHT.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,       
        Data.TYPEOF.bool, 
        LEFT.data | RIGHT.data
    );
}
Operation.OPERATION[Operation.TYPEOF["^"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type !== Data.TYPEOF.number &&
        LEFT.type !== Data.TYPEOF.bool ||
        RIGHT.type !== Data.TYPEOF.number &&
        RIGHT.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool, 
        LEFT.data ^ RIGHT.data
    );
}
Operation.OPERATION[Operation.TYPEOF["&"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type !== Data.TYPEOF.number &&
        LEFT.type !== Data.TYPEOF.bool ||
        RIGHT.type !== Data.TYPEOF.number &&
        RIGHT.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool, 
        LEFT.data & RIGHT.data
    );
}

Operation.OPERATION[Operation.TYPEOF["=="]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type === Data.TYPEOF.array ||
        RIGHT.type === Data.TYPEOF.array
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool, 
        LEFT.data == RIGHT.data
    );
}
Operation.OPERATION[Operation.TYPEOF["!="]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type === Data.TYPEOF.array ||
        RIGHT.type === Data.TYPEOF.array
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool, 
        LEFT.data != RIGHT.data
    );
}
Operation.OPERATION[Operation.TYPEOF["==="]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type === Data.TYPEOF.array ||
        RIGHT.type === Data.TYPEOF.array
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool, 
        LEFT.data === RIGHT.data
    );
}
Operation.OPERATION[Operation.TYPEOF["!=="]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type === Data.TYPEOF.array ||
        RIGHT.type === Data.TYPEOF.array
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool, 
        LEFT.data !== RIGHT.data
    );
}

Operation.OPERATION[Operation.TYPEOF["<"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type !== Data.TYPEOF.number &&
        LEFT.type !== Data.TYPEOF.bool ||
        RIGHT.type !== Data.TYPEOF.number &&
        RIGHT.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool, 
        LEFT.data < RIGHT.data
    );
}
Operation.OPERATION[Operation.TYPEOF["<="]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type !== Data.TYPEOF.number &&
        LEFT.type !== Data.TYPEOF.bool ||
        RIGHT.type !== Data.TYPEOF.number &&
        RIGHT.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool, 
        LEFT.data <= RIGHT.data
    );
}
Operation.OPERATION[Operation.TYPEOF[">"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type !== Data.TYPEOF.number &&
        LEFT.type !== Data.TYPEOF.bool ||
        RIGHT.type !== Data.TYPEOF.number &&
        RIGHT.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool, 
        LEFT.data > RIGHT.data
    );
}
Operation.OPERATION[Operation.TYPEOF[">="]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type !== Data.TYPEOF.number &&
        LEFT.type !== Data.TYPEOF.bool ||
        RIGHT.type !== Data.TYPEOF.number &&
        RIGHT.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool, 
        LEFT.data >= RIGHT.data
    );
}

Operation.OPERATION[Operation.TYPEOF["+"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type === Data.TYPEOF.null ||
        LEFT.type === Data.TYPEOF.array ||
        RIGHT.type === Data.TYPEOF.null ||
        RIGHT.type === Data.TYPEOF.array
    )
    {
        evoke_error(program, 0);
    }

    if (LEFT.type === Data.TYPEOF.string ||
        RIGHT.type === Data.TYPEOF.string
    )
    {
        allocate(
            program,
            RESULT,
            Data.TYPEOF.string, 
            LEFT.data + RIGHT.data
        );
    }
    else
    {
        allocate(
            program,
            RESULT,
            Data.TYPEOF.number, 
            LEFT.data + RIGHT.data
        );
    }
}
Operation.OPERATION[Operation.TYPEOF["-"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type !== Data.TYPEOF.bool &&
        LEFT.type !== Data.TYPEOF.number ||
        RIGHT.type !== Data.TYPEOF.bool &&
        RIGHT.type !== Data.TYPEOF.number
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.number, 
        LEFT.data - RIGHT.data
    );
}
Operation.OPERATION[Operation.TYPEOF["*"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);
    
    if (LEFT.type === Data.TYPEOF.string)
    {
        if (RIGHT.type !== Data.TYPEOF.number)
        {
            evoke_error(program, 0);
        }
        
        allocate(
            program,
            RESULT,
            Data.TYPEOF.string, 
            LEFT.data.repeat(RIGHT.data)
        );
        
        return;
    }
    if (LEFT.type === Data.TYPEOF.array)
    {
        if (RIGHT.type !== Data.TYPEOF.number)
        {
            evoke_error(program, 0);
        }
        
        const ARRAY = [];
        for (var i = 0; i < RIGHT.data; i += 1)
        {
            for (const ELEMENT of LEFT.data)
            {
                const DREF      = sget(program, ELEMENT); 
                const MIDPOINT  = new Data(Data.TYPEOF.null, null);
                
                allocate_from(program, MIDPOINT, DREF);
                
                ARRAY.push(MIDPOINT);
                
                program.heap[DREF.data].reference_count += 1;
            }
        }
        
        allocate(
            program,
            RESULT,
            Data.TYPEOF.array, 
            ARRAY
        );
        
        return;
    }

    if (LEFT.type !== Data.TYPEOF.number &&
        LEFT.type !== Data.TYPEOF.bool ||
        RIGHT.type !== Data.TYPEOF.number &&
        RIGHT.type !== Data.TYPEOF.bool
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.number, 
        LEFT.data * RIGHT.data
    );
}
Operation.OPERATION[Operation.TYPEOF["/"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type !== Data.TYPEOF.number ||
        RIGHT.type !== Data.TYPEOF.number
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.number, 
        LEFT.data / RIGHT.data
    );
}
Operation.OPERATION[Operation.TYPEOF["//"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type !== Data.TYPEOF.number ||
        RIGHT.type !== Data.TYPEOF.number
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.number, 
        Math,trunc(LEFT.data / RIGHT.data)
    );
}
Operation.OPERATION[Operation.TYPEOF["%"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const LEFT      = get(program, operands[1]);
    const RIGHT     = get(program, operands[2]);

    if (LEFT.type !== Data.TYPEOF.number ||
        RIGHT.type !== Data.TYPEOF.number
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.number, 
        LEFT.data % RIGHT.data
    );
}

Operation.OPERATION[Operation.TYPEOF["un-"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const VALUE     = get(program, operands[1]);

    if (VALUE.type !== Data.TYPEOF.number)
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.number,
        -VALUE.data
    );
}
Operation.OPERATION[Operation.TYPEOF["not"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const VALUE     = get(program, operands[1]);
    
    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool,
        ! to_bool(program, VALUE)
    );
}

Operation.OPERATION[Operation.TYPEOF["array_access"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const ARRAY     = get(program, operands[1]);
    const INDEX     = get(program, operands[2]);
    
    if (ARRAY.type !== Data.TYPEOF.array ||
        INDEX.type !== Data.TYPEOF.number
    )
    {
        evoke_error(program, 0);
    }
    if (INDEX.data < 0 ||
        INDEX.data >= ARRAY.data.length ||
        INDEX.data % 1 != 0)
    {
        evoke_error_message(program, "trying to access float index or out of bounds");
    }
    
    const ELEMENT = ARRAY.data[INDEX.data];
    
    deallocate(program, RESULT);
    program.heap[ELEMENT.data].reference_count += 1;
    
    RESULT.type = ELEMENT.type;
    RESULT.data = ELEMENT.data;
}
Operation.OPERATION[Operation.TYPEOF["slice"]] =
function (program, operands)
{
    const SLICE     = sget(program, operands[0]);
    const SEQUENCE  = get(program, operands[1]);
    const BEGIN     = get(program, operands[2]);
    const END       = get(program, operands[3]);
    
    if (SEQUENCE.type !== Data.TYPEOF.string &&
        SEQUENCE.type !== Data.TYPEOF.array ||
        BEGIN.type !== Data.TYPEOF.number ||
        END.type !== Data.TYPEOF.number
    )
    {
        evoke_error(program, 0);
    }
    
    if (SEQUENCE.type === Data.TYPEOF.string)
    {
        allocate(
            program,
            SLICE,
            Data.TYPEOF.string,
            SEQUENCE.data.slice(BEGIN.data, END.data)
        );
    }
    if (SEQUENCE.type !== Data.TYPEOF.array)
    {
        const ARRAY = [];
        
        for (const ELEMENT of SEQUENCE.data.slice(BEGIN.data, END.data))
        {
            const DREF = program.heap[ELEMENT.data];
            
            ARRAY.push(new HeapData(Data.TYPEOF.null, null));
            
            allocate_from(
                program,
                ARRAY.at(-1),
                DREF
            );
        }
        
        allocate(
            program,
            SLICE,
            Data.TYPEOF.array,
            ARRAY
        );
    }
}

Operation.OPERATION[Operation.TYPEOF["len"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const OBJECT    = get(program, operands[1]);

    if (OBJECT.type !== Data.TYPEOF.string &&
        OBJECT.type !== Data.TYPEOF.array
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.number, 
        OBJECT.data.length
    );
}
Operation.OPERATION[Operation.TYPEOF["push"]] =
function (program, operands)
{
    const ARRAY    = get(program, operands[0]);
    const VALUE     = operands[1];

    if (ARRAY.type !== Data.TYPEOF.array)
    {
        evoke_error(program);
    }

    ARRAY.data.push(new HeapData(Data.TYPEOF.null, null));
    const ELEMENT = ARRAY.data.at(-1);
    
    allocate_from(
        program,
        ELEMENT,
        VALUE
    );
}
Operation.OPERATION[Operation.TYPEOF["pop"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const ARRAY     = get(program, operands[1]);
    
    if (ARRAY.type !== Data.TYPEOF.array)
    {
        evoke_error(program);
    }
    if (ARRAY.data.length === 0)
    {
        evoke_error_message(program, "can't pop from empty array");
    }
    
    deallocate(program, RESULT);
    
    const ELEMENT = program.heap[ARRAY.data.pop().data];
    
    RESULT.type = ELEMENT.type;
    RESULT.data = ELEMENT.data;
}
Operation.OPERATION[Operation.TYPEOF["split"]] =
function (program, operands)
{
    const RESULT        = sget(program, operands[0]);
    const STRING        = get(program, operands[1]);
    const DELIMETER     = get(program, operands[2]);
    
    if (STRING.type !== Data.TYPEOF.string ||
        DELIMETER.type !== Data.TYPEOF.string 
    )
    {
        evoke_error(program, 0);
    }
    
    const ARRAY         = STRING.data.split(DELIMETER.data);
    const RESULT_ARRAY  = [];
    for (const ELEMENT of ARRAY)
    {
        const ENDPOINT = new Data(Data.TYPEOF.null, null);
            
        allocate(program, ENDPOINT, Data.TYPEOF.string, ELEMENT);
        
        RESULT_ARRAY.push(ENDPOINT);
    }
    
    allocate(
        program,
        RESULT,
        Data.TYPEOF.array, 
        RESULT_ARRAY
    );
}
Operation.OPERATION[Operation.TYPEOF["join"]] =
function (program, operands)
{
    const RESULT        = sget(program, operands[0]);
    const ARRAY         = get(program, operands[1]);
    const DELIMETER     = get(program, operands[2]);
    
    if (ARRAY.type !== Data.TYPEOF.array ||
        DELIMETER.type !== Data.TYPEOF.string
    )
    {
        evoke_error(program, 0);
    }
    
    var array = [];
    for (const ELEMENT of ARRAY.data)
    {
        array.push(to_string(program, get(program, ELEMENT)));
    }
    
    allocate(
        program,
        RESULT,
        Data.TYPEOF.string, 
        array.join(DELIMETER.data)
    );
}
Operation.OPERATION[Operation.TYPEOF["codeOfChar"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const OBJECT    = get(program, operands[1]);
    const INDEX     = get(program, operands[2]);

    if (OBJECT.type !== Data.TYPEOF.string ||
        INDEX.type !== Data.TYPEOF.number ||
        INDEX.data % 1 !== 0 ||
        INDEX.data < 0 ||
        INDEX.data > OBJECT.data.length
    )
    {
        evoke_error(program, 0);
    }

    allocate(
        program,
        RESULT,
        Data.TYPEOF.number, 
        OBJECT.data.charCodeAt(INDEX.data)
    );
}

Operation.OPERATION[Operation.TYPEOF["print"]] =
function (program, operands)
{
    for (const ELEMENT of operands)
    {
        print(program, ELEMENT);
    }
}
Operation.OPERATION[Operation.TYPEOF["println"]] =
function (program, operands)
{
    for (const ELEMENT of operands)
    {
        print(program, ELEMENT);
    }
    
    print(program, new Data(Data.TYPEOF.string, "\n"));
}
Operation.OPERATION[Operation.TYPEOF["await"]] =
function (program, operands)
{
    const HINT_TEXT = get(program, operands[0]);
    
    program.is_end = true;
    
    if (HINT_TEXT.type === Data.TYPEOF.null ||
        HINT_TEXT.type === Data.TYPEOF.array
    )
    {
        await_input("");
    }
    else
    {
        await_input(String(HINT_TEXT.data));
    }
}
Operation.OPERATION[Operation.TYPEOF["input"]] =
function (program, operands)
{
    const INPUT = sget(program, operands[0]);
    
    allocate(program, INPUT, Data.TYPEOF.string, get_input());
}

Operation.OPERATION[Operation.TYPEOF["format"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const VALUE     = get(program, operands[1]);
    
    allocate(
        program,
        RESULT,
        Data.TYPEOF.string,
        get_format(program, VALUE)
    );
}

Operation.OPERATION[Operation.TYPEOF["clone"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const VALUE     = get(program, operands[1]);
    
    clone(
        program,
        RESULT,
        VALUE
    );
}


Operation.OPERATION[Operation.TYPEOF["is_null"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const VALUE     = get(program, operands[1]);

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool,
        VALUE.type === Data.TYPEOF.null
    );
}
Operation.OPERATION[Operation.TYPEOF["is_bool"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const VALUE     = get(program, operands[1]);

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool,
        VALUE.type === Data.TYPEOF.bool
    );
}
Operation.OPERATION[Operation.TYPEOF["is_number"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const VALUE     = get(program, operands[1]);

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool,
        VALUE.type === Data.TYPEOF.number
    );
}
Operation.OPERATION[Operation.TYPEOF["is_string"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const VALUE     = get(program, operands[1]);

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool,
        VALUE.type === Data.TYPEOF.string
    );
}
Operation.OPERATION[Operation.TYPEOF["is_array"]] =
function (program, operands)
{
    const RESULT    = sget(program, operands[0]);
    const VALUE     = get(program, operands[1]);

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool,
        VALUE.type === Data.TYPEOF.array
    );
}

Operation.OPERATION[Operation.TYPEOF["to_bool"]] =
function (program, operands)
{
    const RESULT        = sget(program, operands[0]);
    const EXPRESSION    = get(program, operands[1]);

    allocate(
        program,
        RESULT,
        Data.TYPEOF.bool, 
        to_bool(program, EXPRESSION)
    );
}
Operation.OPERATION[Operation.TYPEOF["to_number"]] =
function (program, operands)
{
    const RESULT        = sget(program, operands[0]);
    const EXPRESSION    = get(program, operands[1]);

    allocate(
        program,
        RESULT,
        Data.TYPEOF.number, 
        to_number(program, EXPRESSION)
    );
}
Operation.OPERATION[Operation.TYPEOF["to_string"]] =
function (program, operands)
{
    const RESULT        = sget(program, operands[0]);
    const EXPRESSION    = get(program, operands[1]);

    allocate(
        program,
        RESULT,
        Data.TYPEOF.string, 
        to_string(program, EXPRESSION)
    );
}

Operation.OPERATION[Operation.TYPEOF["exit"]] =
function (program, operands)
{
    print(program, new Data(Data.TYPEOF.string, "\nExit value: "));
    print(program, program.return_value);
    print(program, new Data(Data.TYPEOF.string, "\nRuntime: " + 
    `${precision(program.overall_time + (performance.now() - program.time_start))}ms`))
}



function to_bool (program, object)
{
    if (object.type === Data.TYPEOF.null)
    {
        return false;
    }
    if (object.type === Data.TYPEOF.bool)
    {
        return object.data;
    }
    if (object.type === Data.TYPEOF.number)
    {
        return object.data != 0;
    }
    if (object.type === Data.TYPEOF.string)
    {
        return object.data != "";
    }
    if (object.type === Data.TYPEOF.array)
    {
        return object.data.length != 0;
    }
    
    evoke_error_message(program, `unknown type in "to_bool"`);
}
function to_number (program, object)
{
    if (object.type === Data.TYPEOF.null)
    {
        return 0;
    }
    if (object.type === Data.TYPEOF.bool)
    {
        return Number(object.data);
    }
    if (object.type === Data.TYPEOF.number)
    {
        return object.data;
    }
    if (object.type === Data.TYPEOF.string)
    {
        return Number(object.data);
    }
    if (object.type === Data.TYPEOF.array)
    {
        evoke_error_message(program, "can't cast array to number");
    }
    
    evoke_error_message(program, `unknown type in "to_number"`);
}
function to_string (program, object)
{
    if (object.type === Data.TYPEOF.null)
    {
        return "null";
    }
    if (object.type === Data.TYPEOF.bool)
    {
        return object.data ? "true" : "false";
    }
    if (object.type === Data.TYPEOF.number)
    {
        return String(object.data);
    }
    if (object.type === Data.TYPEOF.string)
    {
        return object.data;
    }
    if (object.type === Data.TYPEOF.array)
    {
        evoke_error_message(program, "can't cast array to string");
    }
    
    evoke_error_message(program, `unknown type in "to_string"`);
}

function clone (program, object, value) 
{
    if (program.free_memory.size == 0)
    {
        var position = program.heap.length;
        program.heap.push(null);
    }
    else
    {
        var position = program.free_memory.values().next().value;

        program.free_memory.delete(position);
    }
    
    if (value.type === Data.TYPEOF.array)
    {
        const ARRAY = [];
        for (const ELEMENT of value.data)
        {
            const ENDPOINT  = new Data(Data.TYPEOF.null, null);
            const MIDPOINT  = new Data(Data.TYPEOF.null, null);
            
            clone(program, ENDPOINT, get(program, ELEMENT));
            allocate(program, MIDPOINT, ENDPOINT.type, ENDPOINT.data);
            
            ARRAY.push(MIDPOINT);
        }
        
        program.heap[position] = new HeapData(Data.TYPEOF.array, ARRAY);
    }
    else 
    {
        program.heap[position] = new HeapData(value.type, value.data);
    }
    
    deallocate(program, object);

    object.type = Data.TYPEOF.dref;
    object.data = position;
}

function allocate (program, object, type, data)
{
    if (program.free_memory.size == 0)
    {
        var position = program.heap.length;
        program.heap.push(null);
    }
    else
    {
        var position = program.free_memory.values().next().value;

        program.free_memory.delete(position);
    }
    
    if (type === Data.TYPEOF.array)
    {
        const ARRAY = [];
        for (const ELEMENT of data)
        {
            const DREF      = sget(program, ELEMENT); 
            const MIDPOINT  = new Data(Data.TYPEOF.null, null);
            
            allocate(program, MIDPOINT, DREF.type, DREF.data);
            
            ARRAY.push(MIDPOINT);
            
            program.heap[DREF.data].reference_count += 1;
        }
        
        program.heap[position] = new HeapData(type, ARRAY);
    }
    else 
    {
        program.heap[position] = new HeapData(type, data);
    }
    
    deallocate(program, object);

    object.type = Data.TYPEOF.dref;
    object.data = position;
}
function allocate_from (program, object, value)
{
    const OBJECT    = pget(program, object)
    const POSITION  = pget(program, value);
    const VALUE     = get(program, value);
    
    if (VALUE.type === Data.TYPEOF.string ||
        VALUE.type === Data.TYPEOF.array 
    )
    {
        program.heap[POSITION.data].reference_count += 1;
        
        OBJECT.type = POSITION.type;
        OBJECT.data = POSITION.data;
    }
    else
    {
        allocate(program, OBJECT, VALUE.type, VALUE.data);
    }
}
function deallocate (program, object)
{
    // DEBUG
    // console.log("DEALLOCATE", object);
    // DEBUG
    
    if (object.type === Data.TYPEOF.dref)
    {
        const POSITION = object.data;
        program.heap[POSITION].reference_count -= 1;

        if (program.heap[POSITION].reference_count === 0)
        {
            const DEALOCATING = program.heap[POSITION];
            
            if (DEALOCATING.type === Data.TYPEOF.array)
            {
                for (const ELEMENT of DEALOCATING.data)
                {
                    deallocate(program, ELEMENT);
                }
            }
            
            program.heap[POSITION] = null;
            program.free_memory.add(POSITION);
        }
    }
}

function get (program, object)
{
    // DEBUG

    // console.log("GET");
    // console.log(object);
    // console.log("----------");
    // for(const data of program.heap)
    // {
    //     console.log(data);
    // }

    // DEBUG

    if (object.type === Data.TYPEOF.sref)
    {
        const POSITION  = object.data;
        const OFFSET    = program.function_offset[POSITION[0]].at(-1);

        return get(program, program.stack[OFFSET + POSITION[1]]);
    }
    if (object.type === Data.TYPEOF.dref)
    {
        const POSITION = object.data;

        return get(program, program.heap[POSITION]);
    }

    return object;
}
function sget (program, object)
{
    // DEBUG

    // console.log("SGET");
    // console.log(object);
    // console.log("----------");
    // for(const data of program.heap)
    // {
    //     console.log(data);
    // }

    // DEBUG

    if (object.type === Data.TYPEOF.sref)
    {
        const POSITION  = object.data;
        const OFFSET    = program.function_offset[POSITION[0]].at(-1);

        return sget(program, program.stack[OFFSET + POSITION[1]]);
    }

    return object;
}
function pget (program, object)
{
    var next_object = null;
    
    if (object.type === Data.TYPEOF.sref)
    {
        const POSITION  = object.data;
        const OFFSET    = program.function_offset[POSITION[0]].at(-1);

        next_object = program.stack[OFFSET + POSITION[1]];
    }
    if (object.type === Data.TYPEOF.dref)
    {
        const POSITION = object.data;

        next_object = program.heap[POSITION];
    }
    
    if (next_object !== null && 
        (next_object.type === Data.TYPEOF.sref ||
        next_object.type === Data.TYPEOF.dref)
    )
    {
        return pget(program, next_object);
    }
    
    return object;
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
    var name = node;
    if (child !== null)
    {
        name = node.children[child - 1].children.type;
    }
    
    if (Operation.TYPEOF.hasOwnProperty(name) === false)
    {
        throw new Error(`no operation named ${name}`);
    }

    return Operation.TYPEOF[name];
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

    return new Data(Data.TYPEOF.sref, POSITION);
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
            POSITION, 
            type, 
            data
        ], 
        null
    );

    return new Data(Data.TYPEOF.sref, POSITION);
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
            POSITION, 
            type, 
            data
        ], 
        null
    );

    return {
        VALUE       : new Data(Data.TYPEOF.sref, POSITION), 
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

function create_function (visitor, name)
{
    const SYMBOL_TABLE = visitor.scope_tree[visitor.current_scope].symbol_table;
    const NAME = "$" + name;
    
    if (SYMBOL_TABLE.has(NAME))
    {
        return SYMBOL_TABLE.get(NAME);
    }
    
    const POSITION = create_position(visitor);
    SYMBOL_TABLE.set(NAME, POSITION);
    
    return POSITION;
}
function get_function (visitor, name, position)
{
    var scope = visitor.current_scope;
    const NAME = "$" + name;

    while (visitor.scope_tree[scope].symbol_table.has(NAME) === false) 
    {
        scope = visitor.scope_tree[scope].parent;

        if (scope === -1) 
        {
            throw new Error(`undeclared variable "${NAME}" at (${position.row}, ${position.column})`);
        }
    }

    return visitor.scope_tree[scope].symbol_table.get(NAME);
}
function create_variable (visitor, name, position)
{
    const SYMBOL_TABLE = visitor.scope_tree[visitor.current_scope].symbol_table;

    if (SYMBOL_TABLE.has(name))
    {
        throw new Error(`variable "${name}" already declared at (${position.row}, ${position.column})`);
    }

    SYMBOL_TABLE.set(name, create_position(visitor));
}
function get_variable (visitor, name, position)
{
    var scope = visitor.current_scope;

    while (visitor.scope_tree[scope].symbol_table.has(name) === false) 
    {
        scope = visitor.scope_tree[scope].parent;

        if (scope === -1) 
        {
            throw new Error(`undeclared variable "${name}" at (${position.row}, ${position.column})`);
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

function is_valid_index (array, index)
{
    return !(index < 0 || index >= array.length || index % 1 != 0);
}


function print (program, object, stack = [])
{
    const VALUE = get(program, object);
    
    for (const PREVIOUS of stack)
    {
        if (PREVIOUS === VALUE)
        {
            if (VALUE.type === Data.TYPEOF.array)
            {
                addOutput(`[...(${VALUE.data.length})]`);
            }
            
            return;
        }
    }
    
    stack.push(VALUE);

    switch (VALUE.type)
    {
        case Data.TYPEOF.null:
        {
            addOutput("null");
        }
        break;

        case Data.TYPEOF.bool:
        case Data.TYPEOF.number:
        {
            addOutput(String(VALUE.data));   
        }
        break;
        case Data.TYPEOF.string:
        {
            addOutput(VALUE.data);   
        }
        break;

        case Data.TYPEOF.array:
        {
            addOutput("[");

            for (const INDEX in VALUE.data)
            {
                const ELEMENT = VALUE.data[INDEX];
    
                if (INDEX > 0)
                {
                    addOutput(", ");
                }
    
                print(program, ELEMENT, stack);
            }
    
            addOutput("]");
        }
        break;

        default:
            console.log(`unknown type: ${VALUE.type}, object ${VALUE}`);
    }
    
    stack.pop();
}
function get_format (program, value, depth = 0)
{
    switch (value.type)
    {
        case Data.TYPEOF.null:
        {
            return ". ".repeat(depth) + "null";
        }
        break;
        case Data.TYPEOF.bool:
        {
            return ". ".repeat(depth) + (value.data ? "true" : "false");
        }
        break;
        case Data.TYPEOF.number:
        {
            return ". ".repeat(depth) + String(value.data);
        }
        break;
        case Data.TYPEOF.string:
        {
            return ". ".repeat(depth) + `"${value.data}"`;
        }
        break;
        case Data.TYPEOF.array:
        {
            var text = ". ".repeat(depth) + "[\n";
            
            for (const INDEX in value.data)
            {
                text += INDEX + ": " + get_format(program, get(program, value.data[INDEX]), depth + 1) + "\n";
            }
            
            text += ". ".repeat(depth) + "]";
            
            return text;
        }
        break;
    }
}

function evoke_error (program, except = -1)
{
    const OPERATION = program.operations[program.current_operation];
    const TYPE      = OPERATION.type;
    const OPERANDS  = OPERATION.operands;
    const POSITION  = OPERATION.position;

    var message = `can't execute "${Operation.OPERATIONS[TYPE]}" with [`;
    for (const INDEX in OPERANDS)
    {
        if (INDEX == except)
        {
            continue;
        }
        if (except != 0 && INDEX != 0 || except == 0 && INDEX != 1)
        {
            message += ", ";
        }

        message += Data.DATA_NAME.get(get(program, OPERANDS[INDEX]).type);
    }
    message += `]`;
    if (POSITION !== null)
    {
        message += ` at (${POSITION.row}, ${POSITION.column})`;
    }

    throw new Error(message);
}
function evoke_error_message (program, message)
{
    const OPERATION = program.operations[program.current_operation];
    const POSITION  = OPERATION.position;

    if (POSITION !== null)
    {
        message += ` at (${POSITION.row}, ${POSITION.column})`;
    }

    throw new Error(message);
}