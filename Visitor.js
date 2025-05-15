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
        
        class       : 9,
        object      : 10,
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
        
        [9, "class"],
        [10, "object"],
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
        
        "field_access",
        "method_access",
        
        "create_field",
        
        "this",
        "new_object",
        "pop_object",
        "get_object",

        "len",
        "push",
        "pop",
        "split",
        "join",
        "code_of_char",

        "print",
        "println",
        "await",
        "input",
        "format",
        "clone",
        "rand",

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
    
    class_id = {};
    class_info = [];
    
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

Visitor.VISIT_RULE["Class"] = 
function (visitor, node, arg)
{
    const NAME          = visitor.visit(node, null, 2).string;
    const POSITION      = create_class(visitor, NAME);
    const PARAMETERS    = structuredClone(arg);
    const CLASS         = {};
    
    PARAMETERS.CLASS = CLASS;
    PARAMETERS.CONSTRUCTOR = false;
    PARAMETERS.ID = 1;
    
    const JUMP = create_operation(
        visitor, 
        get_operation("jump"), 
        [new Data(Data.TYPEOF.jump, null)], 
        null
    );
    
    const FUNCTION_ID   = open_function(visitor);
    CLASS["$"]          = new Data(
        Data.TYPEOF.function, 
        [
            JUMP + 1, 
            FUNCTION_ID
        ]
    );
        
    branch_scope(visitor);
    PARAMETERS.VISIT_COUNT = 1;
    visitor.visit(node, PARAMETERS, 4);
    
    PARAMETERS.VISIT_COUNT = 2;
    visitor.visit(node, PARAMETERS, 4);
    
    close_function(visitor);
    
    PARAMETERS.VISIT_COUNT = 3;
    visitor.visit(node, PARAMETERS, 4);
    leave_scope(visitor);
    
    visitor.operations[JUMP].operands[0].data = next_operation(visitor);
    
    const CLASS_VALUE = create_value(visitor, Data.TYPEOF.class, CLASS);
    create_operation(
        visitor,
        get_operation("="),
        [
            POSITION,
            CLASS_VALUE
        ],
        null
    );
}
Visitor.VISIT_RULE["ClassStatements"] = 
function (visitor, node, arg)
{
    visitor.visit(node, arg, 1);
    
    if (length_is(node, 2))
    {
        visitor.visit(node, arg, 2);
    }
}
Visitor.VISIT_RULE["ClassStatement"] = 
function (visitor, node, arg)
{
    visitor.visit(node, arg, 1);
}
Visitor.VISIT_RULE["Constructor"] = 
function (visitor, node, arg)
{
    const PARAMETERS = arg;
    
    if (PARAMETERS.VISIT_COUNT === 2)
    {
        if (PARAMETERS.CONSTRUCTOR)
        {
            const POSITION = get_position(node, 1);
            throw new Error(`constructor was declared twice at (${POSITION.row}, ${POSITION.column})`);
        }
        
        if (length_is(node, 4))
        {
            visitor.visit(node, PARAMETERS, 4);
        }
        else 
        {
            visitor.visit(node, null, 3);
            visitor.visit(node, PARAMETERS, 5);
        }
        
        PARAMETERS.CONSTRUCTOR = true;
    }
}
// Visitor.VISIT_RULE["AccessSpecifier"] = 
// function (visitor, node, arg)
// {
//     visitor.visit(node, arg, 1);
// }
// Visitor.VISIT_RULE["Public"] = 
// function (visitor, node, arg)
// {
//     arg.is_private = false;
// }
// Visitor.VISIT_RULE["Private"] = 
// function (visitor, node, arg)
// {
//     arg.is_private = true;
// }
Visitor.VISIT_RULE["ClassMember"] = 
function (visitor, node, arg)
{
    const ID = visitor.visit(node, null, 1);
    
    visitor.visit(node, {ID : ID, PARAMETERS : arg}, 2);
}
Visitor.VISIT_RULE["$ClassMember"] = 
function (visitor, node, arg)
{
    visitor.visit(node, arg, 1);
}
Visitor.VISIT_RULE["ClassField"] = 
function (visitor, node, arg)
{
    const PARAMETERS = arg.PARAMETERS;
    
    if (PARAMETERS.VISIT_COUNT === 1)
    {
        const CLASS     = PARAMETERS.CLASS;
        const ID        = arg.ID;
        const NAME      = "CF$" + ID.string;
        const POSITION  = ID.position;
        
        if (CLASS.hasOwnProperty(NAME))
        {
            throw new Error(`field was declared twice at (${POSITION.row}, ${POSITION.column})`); 
        }
        CLASS[NAME] = PARAMETERS.ID++;
        
        if (length_is(node, 3))
        {
            create_operation(
                visitor,
                get_operation("create_field"),
                [
                    CLASS[NAME],
                    visitor.visit(node, null, 2),
                ],
                null
            );
        }
        else
        {
            create_operation(
                visitor,
                get_operation("create_field"),
                [
                    CLASS[NAME],
                    create_value(visitor, Data.TYPEOF.null, null),
                ],
                null
            );
        }
    }
}
Visitor.VISIT_RULE["ClassMethod"] = 
function (visitor, node, arg)
{
    const PARAMETERS = arg.PARAMETERS;
    
    if (PARAMETERS.VISIT_COUNT === 3)
    {
        const CLASS         = PARAMETERS.CLASS;
        const ID            = arg.ID;
        const NAME          = "CM$" + ID.string;
        const POSITION      = ID.position;
        
        if (CLASS.hasOwnProperty(NAME))
        {
            throw new Error(`method was declared twice at (${POSITION.row}, ${POSITION.column})`); 
        }
        const FUNCTION_ID   = open_function(visitor);
        CLASS[NAME]         = new Data(
            Data.TYPEOF.function, 
            [
                next_operation(visitor), 
                FUNCTION_ID
            ]
        );
        
        branch_scope(visitor);
        
        if (length_is(node, 3))
        {
            visitor.visit(node, {}, 3);
        }
        else 
        {
            visitor.visit(node, null, 2);
            visitor.visit(node, {}, 4);
        }
        
        close_function(visitor);
        leave_scope(visitor);
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
    const RESULT    = create_position(visitor);
    const OBJECT    = arg;
    const ID        = visitor.visit(node, null, 1);
    const NAME      = ID.string; 
    const POSITION  = ID.position;
    
    if (length_is(node, 2))
    {
        return visitor.visit(node, [OBJECT, NAME, POSITION], 2);
    }
    
    create_operation(
        visitor, 
        get_operation("field_access"),
        [RESULT, OBJECT, NAME],
        POSITION
    );
    
    return RESULT;
}
Visitor.VISIT_RULE["MethodAccess"] = 
function (visitor, node, arg)
{
    const RESULT        = create_position(visitor);
    const OBJECT        = arg[0];
    const NAME          = arg[1]; 
    const POSITION      = arg[2];
    const PARAMETERS    = [];
    
    visitor.visit(node, PARAMETERS, 2);
    
    create_operation(
        visitor, 
        get_operation("method_access"),
        [OBJECT, NAME, PARAMETERS],
        POSITION
    );
    create_operation(
        visitor, 
        get_operation("pop_object"),
        [RESULT],
        null
    );
    
    return RESULT;
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

Visitor.VISIT_RULE["ClassObject"] = 
function (visitor, node, arg)
{
    const PARAMETERS    = [];
    const ID            = visitor.visit(node, null, 2);
    const POSITION      = ID.position;
    const NAME          = ID.string;
    const CLASS         = get_class(visitor, NAME, POSITION);
    
    if (length_is(node, 5))
    {
        visitor.visit(node, PARAMETERS, 4);
    }
    
    create_operation(
        visitor, 
        get_operation("new_object"), 
        [
            CLASS,
            PARAMETERS,
        ], 
        null
    );
    
    const OBJECT = create_position(visitor);
    create_operation(
        visitor, 
        get_operation("get_object"), 
        [OBJECT], 
        null
    );
    
    return OBJECT;
}
Visitor.VISIT_RULE["This"] = 
function (visitor, node, arg)
{
    const OBJECT    = create_position(visitor);
    const POSITION  = get_position(node, 1);
    
    create_operation(
        visitor, 
        get_operation("this"), 
        [OBJECT], 
        POSITION
    );
    
    return OBJECT;
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
    const NAME      = name_of(node, 1);
    const POSITION  = get_position(node, 1);

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
                POSITION
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
                POSITION
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
                POSITION
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
                POSITION
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
                POSITION
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
                POSITION
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
                POSITION
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
                POSITION
            );
            const INPUT = create_position(visitor);
            create_operation(
                visitor, 
                get_operation("input"), 
                [INPUT], 
                POSITION
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
                POSITION
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
                POSITION
            );

            return RESULT;
        }
        break;
        
        case "rand":
        {
            const RESULT    = create_position(visitor);

            create_operation(
                visitor, 
                get_operation("rand"), 
                [RESULT], 
                POSITION
            );

            return RESULT;
        }
        break;
        
        
        case "len":
        {
            const RESULT = create_position(visitor);
            const OBJECT = visitor.visit(node, null, 3);
            
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
            const VALUE = visitor.visit(node, null, 5);
            const OBJECT = visitor.visit(node, null, 3);
            
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
            const OBJECT = visitor.visit(node, null, 3);
            
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
            const STRING        = visitor.visit(node, null, 3);
            const DELIMETER     = visitor.visit(node, null, 5);
            
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
            const ARRAY         = visitor.visit(node, null, 3);
            const DELIMETER     = visitor.visit(node, null, 5);
            
            create_operation(
                visitor,
                get_operation("join"),
                [STRING, ARRAY, DELIMETER],
                POSITION
            );
            
            return STRING;
        }
        break;
        
        case "code_of_char":
        {
            const RESULT    = create_position(visitor);
            const OBJECT    = visitor.visit(node, null, 3);
            const INDEX     = visitor.visit(node, null, 5);
            
            create_operation(
                visitor,
                get_operation("code_of_char"),
                [RESULT, OBJECT, INDEX],
                POSITION
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

    // return Operation.OPERATION[Operation.TYPEOF[name]];
    
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

function create_class (visitor, name)
{
    const SYMBOL_TABLE  = visitor.scope_tree[visitor.current_scope].symbol_table;
    const NAME          = "C$" + name;
    
    if (SYMBOL_TABLE.has(NAME))
    {
        return SYMBOL_TABLE.get(NAME);
    }
    
    const POSITION = create_position(visitor);
    SYMBOL_TABLE.set(NAME, POSITION);
    
    return POSITION;
}
function get_class (visitor, name, position)
{
    var scope = visitor.current_scope;
    const NAME = "C$" + name;

    while (visitor.scope_tree[scope].symbol_table.has(NAME) === false) 
    {
        scope = visitor.scope_tree[scope].parent;

        if (scope === -1) 
        {
            throw new Error(`undeclared class "${NAME}" at (${position.row}, ${position.column})`);
        }
    }

    return visitor.scope_tree[scope].symbol_table.get(NAME);
}
function create_function (visitor, name)
{
    const SYMBOL_TABLE = visitor.scope_tree[visitor.current_scope].symbol_table;
    const NAME = "F$" + name;
    
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
    const NAME = "F$" + name;

    while (visitor.scope_tree[scope].symbol_table.has(NAME) === false) 
    {
        scope = visitor.scope_tree[scope].parent;

        if (scope === -1) 
        {
            throw new Error(`undeclared function "${name}" at (${position.row}, ${position.column})`);
        }
    }

    return visitor.scope_tree[scope].symbol_table.get(NAME);
}
function create_variable (visitor, name, position)
{
    const NAME          = "V$" + name;
    const SYMBOL_TABLE  = visitor.scope_tree[visitor.current_scope].symbol_table;

    if (SYMBOL_TABLE.has(NAME))
    {
        throw new Error(`variable "${name}" already declared at (${position.row}, ${position.column})`);
    }

    SYMBOL_TABLE.set(NAME, create_position(visitor));
}
function get_variable (visitor, name, position)
{
    const NAME  = "V$" + name;
    var scope   = visitor.current_scope;

    while (visitor.scope_tree[scope].symbol_table.has(NAME) === false) 
    {
        scope = visitor.scope_tree[scope].parent;

        if (scope === -1) 
        {
            throw new Error(`undeclared variable "${name}" at (${position.row}, ${position.column})`);
        }
    }

    return visitor.scope_tree[scope].symbol_table.get(NAME);
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