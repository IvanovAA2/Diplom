class Program
{
    operations = [];
    
    current_operation;
    
    function_memory;

    stack;

    function_offset;
    parameter_stack;
    jump_back;
    return_value;
    
    object_stack;

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
            this.free_memory        = [];

            this.parameter_stack    = [];
            this.jump_back          = [];
            this.return_value       = new Data(null, null);
            
            this.object_stack       = [];

            this.overall_time       = 0;

            // DEBUG
            
            // for (const INDEX in Operation.OPERATIONS)
            // {
            //     console.log(`${INDEX}:\t ${Operation.OPERATIONS[INDEX]}\n`)
            // }

            // let text = "", cnt = -1;

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
            
            // let text = `!!!!!!!!!!!!!!!!!\n${this.current_operation} \t${Operation.OPERATIONS[OPERATION.type]} (${OPERATION.type}): `;
            // for (const OPERAND of OPERATION.operands)
            // {
            //     if (OPERAND && OPERAND.hasOwnProperty("data"))
            //     {
            //         if (OPERAND.type === Data.TYPEOF.string)
            //         {
            //             text += `(${Data.DATA_NAME.get(OPERAND.type)}: "${OPERAND.data})" `;
            //         }
            //         else if (OPERAND.type === Data.TYPEOF.array)
            //         {
            //             text += `(${Data.DATA_NAME.get(OPERAND.type)}: [ `;
                        
            //             for (const ELEMENT of OPERAND.data)
            //             {
            //                 text += `${ELEMENT.data} `;
            //             }
                        
            //             text += "] ";
            //         }
            //         else
            //         {
            //             text += `(${Data.DATA_NAME.get(OPERAND.type)}: ${OPERAND.data}) `;
            //         }
            //     }
            //     else if (OPERAND && OPERAND.hasOwnProperty("$"))
            //     {
            //         text += `class\n`;
                        
            //         for (const NAME in OPERAND)
            //         {
            //             text += `${NAME} : ${OPERAND[NAME]}\n`;
            //         }
            //     }
            //     else
            //     {
            //         text += OPERAND + " ";
            //     }
            // }
            // console.log(text);
            
            // DEBUG
            
            const OPERANDS = OPERATION.operands;
            // CHANGE
            OPERATION.type(this, OPERANDS);
            // Operation.OPERATION[OPERATION.type](this, OPERANDS);
            
            this.current_operation += 1;
        }

        this.overall_time += performance.now() - this.time_start;
    }
    
    getv (object)
    {
        const POSITION      = object.data;
        const FUNCTION_ID   = POSITION[0];
        const OFFSET        = this.function_offset[FUNCTION_ID].at(-1);
        const SHIFT         = POSITION[1];

        return this.stack[OFFSET + SHIFT];
    }
    getp (object)
    {
        const POSITION      = object.data;
        const FUNCTION_ID   = POSITION[0];
        const OFFSET        = this.function_offset[FUNCTION_ID].at(-1);
        const SHIFT         = POSITION[1];

        return OFFSET + SHIFT;
    }

    print (VALUE, stack = [])
    {
        if (VALUE.type === Data.TYPEOF.array ||
            VALUE.type === Data.TYPEOF.object
        )
        {
            for (const PREVIOUS of stack)
            {
                if (VALUE === PREVIOUS)
                {
                    if (VALUE.type === Data.TYPEOF.array)
                    {
                        addOutput(`[...(${VALUE.data.length})]`);
                    }
                    if (VALUE.type === Data.TYPEOF.object)
                    {
                        addOutput(`{...(${VALUE.data.length - 1})}`);
                    }
                    
                    return;
                }
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
        
                    this.print(ELEMENT, stack);
                }
        
                addOutput("]");
            }
            break;
            case Data.TYPEOF.object:
            {
                addOutput("{");

                for (const NAME in VALUE.data[0].data)
                {
                    if (NAME !== "$")
                    {
                        const ELEMENT = VALUE.data[VALUE.data[0].data[NAME]];
            
                        addOutput(NAME + ": ");
            
                        this.print(ELEMENT, stack);
                    }
                }
        
                addOutput("}");
            }
            break;
            case Data.TYPEOF.function:
            case Data.TYPEOF.default_function:
            case Data.TYPEOF.method:
            case Data.TYPEOF.default_method:
            {
                addOutput("function");
            }
            break;
            default:
            {
                return `unknown type: ${VALUE.type}, object ${VALUE}`;
            }
        }
        
        stack.pop();
    }
    get_format (value, depth = 0, nl = false, stack = [])
    {
        const VALUE = value;
        if (VALUE.type === Data.TYPEOF.array ||
            VALUE.type === Data.TYPEOF.object
        )
        {
            for (const PREVIOUS of stack)
            {
                if (VALUE === PREVIOUS)
                {
                    if (VALUE.type === Data.TYPEOF.array)
                    {
                        addOutput(`[...(${VALUE.data.length})]`);
                    }
                    if (VALUE.type === Data.TYPEOF.object)
                    {
                        addOutput(`{...(${VALUE.data.length - 1})}`);
                    }
                    
                    return;
                }
            }
            
        }
        stack.push(VALUE);
        
        switch (value.type)
        {
            case Data.TYPEOF.null:
            {
                stack.pop();
                return "null";
            }
            break;
            case Data.TYPEOF.bool:
            {
                stack.pop();
                return value.data ? "true" : "false";
            }
            break;
            case Data.TYPEOF.number:
            {
                stack.pop();
                return String(value.data);
            }
            break;
            case Data.TYPEOF.string:
            {
                stack.pop();
                return `"${value.data}"`;
            }
            break;
            case Data.TYPEOF.array:
            {
                let text = "";
                if (nl)
                {
                    text = "\n";
                }
                text += ". ".repeat(depth) + "[\n";
                
                for (const INDEX in value.data)
                {
                    text += ". ".repeat(depth + 1) + INDEX + ": " + this.get_format(value.data[INDEX], depth + 1, true, stack) + "\n";
                }
                
                text += ". ".repeat(depth) + "]";
                
                stack.pop();
                return text;
            }
            break;
            case Data.TYPEOF.object:
            {
                let text = "";
                if (nl)
                {
                    text = "\n";
                }
                text += ". ".repeat(depth) + "{\n";
                
                for (const NAME in value.data[0].data)
                {
                    if (isNaN(value.data[0].data[NAME]) === false)
                    {
                        text += ". ".repeat(depth + 1) + NAME + ": " + this.get_format(value.data[value.data[0].data[NAME]], depth + 1, true, stack) + "\n";
                    }
                }
                
                text += ". ".repeat(depth) + "}";
                
                stack.pop();
                return text;
            }
            break;
            case Data.TYPEOF.function:
            case Data.TYPEOF.default_function:
            case Data.TYPEOF.method:
            case Data.TYPEOF.default_method:
            {
                stack.pop();
                return `"function"`;
            }
            break;
            default:
            {
                stack.pop();
                return `Unknown type: ${value.type}`;
            }
        }
    }

    evoke_error (except = -1)
    {
        const OPERATION = this.operations[this.current_operation];
        const TYPE      = OPERATION.type;
        const OPERANDS  = OPERATION.operands;
        const POSITION  = OPERATION.position;

        let message = `can't execute "${Operation.OPERATIONS[TYPE]}" with [`;
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

            if (OPERANDS[INDEX].type === Data.TYPEOF.ref)
            {
                message += Data.DATA_NAME.get(program.getv(OPERANDS[INDEX]).type);
            }
        }
        message += `]`;
        if (POSITION !== null)
        {
            message += ` at (${POSITION.row}, ${POSITION.column})`;
        }

        throw new Error(message);
    }
    evoke_error_message (message)
    {
        const OPERATION = this.operations[this.current_operation];
        const POSITION  = OPERATION.position;

        if (POSITION !== null)
        {
            message += ` at (${POSITION.row}, ${POSITION.column})`;
        }

        throw new Error(message);
    }
}

Operation.OPERATION[Operation.TYPEOF["initialization"]] =
function (program, operands)
{
    const LENGTH = operands[0].length;
    program.function_offset = [];
    for (let i = 0; i < LENGTH; i += 1)
    {
        program.function_offset.push([])
    }
    
    program.function_memory = operands[0];
}
Operation.OPERATION[Operation.TYPEOF["break_point"]] =
function (program, operands)
{
    const POSITION = operands[0];
    console.log(`breakpoint at (${POSITION.row}, ${POSITION.column})`);
    
}

Operation.OPERATION[Operation.TYPEOF["function"]] = 
function (program, operands)
{
    let FUNCTION = operands[0];
    if (FUNCTION.type === Data.TYPEOF.ref)
    {
        FUNCTION = program.getv(FUNCTION);
    }
    const PARAMETERS    = structuredClone(operands[1]);
    
    for (const INDEX in PARAMETERS)
    {
        PARAMETERS[INDEX] = program.getv(PARAMETERS[INDEX]);
    }
    program.parameter_stack.push(PARAMETERS);
    
    if (FUNCTION.type === Data.TYPEOF.default_function)
    {
        // CHANGE
        FUNCTION.data(program, PARAMETERS);
        // Operation.OPERATION[FUNCTION.data](program, PARAMETERS);
        
        return;
    }
    if (FUNCTION.type === Data.TYPEOF.default_method)
    {
        const OBJECT    = FUNCTION.data[0];
        const NAME      = FUNCTION.data[1];
        
        program.object_stack.push(OBJECT);
        
        // CHANGE
        get_operation(NAME)(program, PARAMETERS);
        // Operation.OPERATION[get_operation(NAME)](program, PARAMETERS);
        
        return;
    }
    if (FUNCTION.type === Data.TYPEOF.method)
    {
        const OBJECT        = program.object_stack.pop();
        const METHOD        = FUNCTION.data;
        const FUNCTION_ID   = METHOD[1];
        const JUMP          = METHOD[0] - 1;
        
        program.function_offset[FUNCTION_ID].push(program.stack.length);
        program.jump_back.push([program.current_operation + 1, FUNCTION_ID]);
        for (let i = 0; i < program.function_memory[FUNCTION_ID]; i += 1)
        {
            program.stack.push(new Data(Data.TYPEOF.null, null));
        }
        
        program.current_operation = JUMP;
        
        program.object_stack.push(OBJECT);
        
        return;
    }
    if (FUNCTION.type !== Data.TYPEOF.function)
    {
        program.evoke_error_message(`can't call function from not function object`);
    }
    
    const FUNCTION_ID = FUNCTION.data[1];
    const JUMP = FUNCTION.data[0] - 1;
    
    program.function_offset[FUNCTION_ID].push(program.stack.length);
    program.jump_back.push([program.current_operation + 1, FUNCTION_ID]);
    for (let i = 0; i < program.function_memory[FUNCTION_ID]; i += 1)
    {
        program.stack.push(new Data(Data.TYPEOF.null, null));
    }
    
    program.current_operation = JUMP;
}
Operation.OPERATION[Operation.TYPEOF["parameter"]] =
function (program, operands)
{
    const PARAMETERS    = program.parameter_stack.at(-1);
    const PARAMETER     = program.getv(operands[0]);
    
    if (PARAMETERS.length)
    {
        var value = PARAMETERS.pop();
    }
    else
    {
        var value = program.getv(operands[1]);
    }
    
    PARAMETER.type = value.type;
    PARAMETER.data = value.data;
}
Operation.OPERATION[Operation.TYPEOF["return"]] =
function (program, operands)
{
    const VALUE = program.getv(operands[0]);

    program.return_value = VALUE;
    
    const FUNCTION_ID = program.jump_back.at(-1)[1];
    program.stack.length = program.function_offset[FUNCTION_ID].pop();
    program.current_operation = program.jump_back.at(-1)[0] - 1;

    program.jump_back.pop();
    program.parameter_stack.pop();
}
Operation.OPERATION[Operation.TYPEOF["get_return"]] =
function (program, operands)
{
    const RESULT        = program.getv(operands[0]);
    const RETURN_VALUE  = program.return_value;
    
    RESULT.type = RETURN_VALUE.type;
    RESULT.data = RETURN_VALUE.data;
}

Operation.OPERATION[Operation.TYPEOF["if"]] =
function (program, operands)
{
    const BOOL_EXPRESSION   = program.getv(operands[0]);
    const JUMP              = operands[1];
    
    if (BOOL_EXPRESSION.data === false)
    {
        program.current_operation = JUMP.data - 1;
    }
}
Operation.OPERATION[Operation.TYPEOF["ifn"]] =
function (program, operands)
{
    const BOOL_EXPRESSION   = program.getv(operands[0]);
    const JUMP              = operands[1];
    
    if (BOOL_EXPRESSION.data === true)
    {
        program.current_operation = JUMP.data - 1;
    }
}
Operation.OPERATION[Operation.TYPEOF["jump"]] =
function (program, operands)
{
    const JUMP = operands[0];

    program.current_operation = JUMP.data - 1;
}

Operation.OPERATION[Operation.TYPEOF["create"]] =
function (program, operands)
{
    const POSITION  = program.getp(operands[0]);
    const TYPE      = operands[1];
    const DATA      = operands[2];

    const STACK = program.stack;
    if (TYPE === Data.TYPEOF.array)
    {
        const ARRAY = [];
        for (const ELEMENT of DATA)
        {
            ARRAY.push(program.getv(ELEMENT));
        }
        STACK[POSITION] = new Data(TYPE, ARRAY);
    }
    else
    {
        STACK[POSITION] = new Data(TYPE, DATA);
    }
}
Operation.OPERATION[Operation.TYPEOF["copy"]] =
function (program, operands)
{
    const POSITION  = program.getp(operands[0]);
    const TYPE      = operands[1];
    const DATA      = operands[2];

    const STACK = program.stack;
    if (TYPE === Data.TYPEOF.array)
    {
        const ARRAY = [];
        for (const ELEMENT of DATA)
        {
            ARRAY.push(program.getv(ELEMENT));
        }
        STACK[POSITION].type = TYPE;
        STACK[POSITION].data = ARRAY;
    }
    else
    {
        STACK[POSITION].type = TYPE;
        STACK[POSITION].data = DATA;
    }
}

Operation.OPERATION[Operation.TYPEOF["="]] =
function (program, operands)
{
    const OBJECT = program.getv(operands[0]);
    
    if (operands[1].type === Data.TYPEOF.function)
    {
        OBJECT.type = Data.TYPEOF.function;
        OBJECT.data = operands[1].data;
    }
    else
    {
        const VALUE = program.getv(operands[1]);
        
        OBJECT.type = VALUE.type;
        OBJECT.data = VALUE.data;
    }
}
Operation.OPERATION[Operation.TYPEOF["+="]] =
function (program, operands)
{
    const OBJECT    = program.getv(operands[0]);
    const VALUE     = program.getv(operands[1]);

    if (!(
        OBJECT.type === Data.TYPEOF.bool ||
        OBJECT.type === Data.TYPEOF.number ||
        OBJECT.type === Data.TYPEOF.string &&
        VALUE.type === Data.TYPEOF.bool ||
        VALUE.type === Data.TYPEOF.number ||
        VALUE.type === Data.TYPEOF.string
    ))
    {
        program.evoke_error();
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
    const OBJECT    = program.getv(operands[0]);
    const VALUE     = program.getv(operands[1]);

    if (!(
        OBJECT.type === Data.TYPEOF.bool ||
        OBJECT.type === Data.TYPEOF.number &&
        VALUE.type === Data.TYPEOF.bool ||
        VALUE.type === Data.TYPEOF.number
    ))
    {
        program.evoke_error();
    }

    OBJECT.type = Data.TYPEOF.number;
    OBJECT.data -= VALUE.data;
}
Operation.OPERATION[Operation.TYPEOF["*="]] =
function (program, operands)
{
    const OBJECT    = program.getv(operands[0]);
    const VALUE     = program.getv(operands[1]);
    
    if (OBJECT.type === Data.TYPEOF.string)
    {
        if (VALUE.type !== Data.TYPEOF.number)
        {
            program.evoke_error();
        }
        
        OBJECT.data = OBJECT.data.repeat(VALUE.data);
        
        return;
    }
    if (OBJECT.type === Data.TYPEOF.array)
    {
        if (VALUE.type !== Data.TYPEOF.number)
        {
            program.evoke_error();
        }
        
        if (VALUE.data < 1)
        {
            OBJECT.data.length = 0;
        }
        else
        {
            const SIZE = OBJECT.data.length;
            for (let i = 2; i <= VALUE.data; ++i)
            {
                for (let j = 0; j < SIZE; ++j)
                {
                    const VALUE = OBJECT.data[j];
                    OBJECT.data.push(new Data(
                        VALUE.type,
                        VALUE.data
                    ));
                }
            }
        }
        
        return;
    }

    if (!(
        OBJECT.type === Data.TYPEOF.number ||
        OBJECT.type === Data.TYPEOF.bool &&
        VALUE.type === Data.TYPEOF.number ||
        VALUE.type === Data.TYPEOF.bool
    ))
    {
        program.evoke_error();
    }

    OBJECT.type = Data.TYPEOF.number;
    OBJECT.data *= VALUE.data;
}
Operation.OPERATION[Operation.TYPEOF["/="]] =
function (program, operands)
{
    const OBJECT    = program.getv(operands[0]);
    const VALUE     = program.getv(operands[1]);

    if (!(
        OBJECT.type === Data.TYPEOF.number &&
        VALUE.type === Data.TYPEOF.number
    ))
    {
        program.evoke_error();
    }

    OBJECT.data /= VALUE.data;
}
Operation.OPERATION[Operation.TYPEOF["//="]] =
function (program, operands)
{
    const OBJECT    = program.getv(operands[0]);
    const VALUE     = program.getv(operands[1]);

    if (!(
        OBJECT.type === Data.TYPEOF.number &&
        VALUE.type === Data.TYPEOF.number
    ))
    {
        program.evoke_error();
    }

    OBJECT.data = Math.trunc(OBJECT.data / VALUE.data);
}
Operation.OPERATION[Operation.TYPEOF["%="]] =
function (program, operands)
{
    const OBJECT    = program.getv(operands[0]);
    const VALUE     = program.getv(operands[1]);

    if (!(
        OBJECT.type === Data.TYPEOF.number &&
        VALUE.type === Data.TYPEOF.number
    ))
    {
        program.evoke_error();
    }

    OBJECT.data %= VALUE.data;
}

Operation.OPERATION[Operation.TYPEOF["or"]] =
function (program, operands)
{
    const RESULT    = program.getv(operands[0]);
    const LEFT      = program.getv(operands[1]);
    const RIGHT     = program.getv(operands[2]);
    
    RESULT.type = Data.TYPEOF.bool;
    if (to_bool(program, LEFT) === true)
    {
        RESULT.data = true;
    }
    else
    {
        RESULT.data = to_bool(program, RIGHT);
    }
}
Operation.OPERATION[Operation.TYPEOF["and"]] =
function (program, operands)
{
    const RESULT    = program.getv(operands[0]);
    const LEFT      = program.getv(operands[1]);
    const RIGHT     = program.getv(operands[2]);

    RESULT.type = Data.TYPEOF.bool;
    if (to_bool(program, LEFT) === false)
    {
        RESULT.data = false;
    }
    else
    {
        RESULT.data = to_bool(program, RIGHT);
    }
}

Operation.OPERATION[Operation.TYPEOF["|"]] =
function (program, operands)
{
    const RESULT    = program.getv(operands[0]);
    const LEFT      = program.getv(operands[1]);
    const RIGHT     = program.getv(operands[2]);

    if (!(
        LEFT.type === Data.TYPEOF.number ||
        LEFT.type === Data.TYPEOF.bool &&
        RIGHT.type === Data.TYPEOF.number ||
        RIGHT.type === Data.TYPEOF.bool
    ))
    {
        program.evoke_error(0);
    }

    RESULT.type = Data.TYPEOF.number;
    RESULT.data = LEFT.data | RIGHT.data;
}
Operation.OPERATION[Operation.TYPEOF["^"]] =
function (program, operands)
{
    const RESULT    = program.getv(operands[0]);
    const LEFT      = program.getv(operands[1]);
    const RIGHT     = program.getv(operands[2]);

    if (!(
        LEFT.type === Data.TYPEOF.number ||
        LEFT.type === Data.TYPEOF.bool &&
        RIGHT.type === Data.TYPEOF.number ||
        RIGHT.type === Data.TYPEOF.bool
    ))
    {
        program.evoke_error(0);
    }

    RESULT.type = Data.TYPEOF.number;
    RESULT.data = LEFT.data ^ RIGHT.data;
}
Operation.OPERATION[Operation.TYPEOF["&"]] =
function (program, operands)
{
    const RESULT    = program.getv(operands[0]);
    const LEFT      = program.getv(operands[1]);
    const RIGHT     = program.getv(operands[2]);

    if (!(
        LEFT.type === Data.TYPEOF.number ||
        LEFT.type === Data.TYPEOF.bool &&
        RIGHT.type === Data.TYPEOF.number ||
        RIGHT.type === Data.TYPEOF.bool
    ))
    {
        program.evoke_error(0);
    }

    RESULT.type = Data.TYPEOF.number;
    RESULT.data = LEFT.data & RIGHT.data;
}

Operation.OPERATION[Operation.TYPEOF["=="]] =
function (program, operands)
{
    const RESULT    = program.getv(operands[0]);
    const LEFT      = program.getv(operands[1]);
    const RIGHT     = program.getv(operands[2]);

    RESULT.type = Data.TYPEOF.bool;
    RESULT.data = LEFT.data == RIGHT.data;
}
Operation.OPERATION[Operation.TYPEOF["!="]] =
function (program, operands)
{
    const RESULT    = program.getv(operands[0]);
    const LEFT      = program.getv(operands[1]);
    const RIGHT     = program.getv(operands[2]);

    RESULT.type = Data.TYPEOF.bool;
    RESULT.data = LEFT.data != RIGHT.data;
}
Operation.OPERATION[Operation.TYPEOF["==="]] =
function (program, operands)
{
    const RESULT    = program.getv(operands[0]);
    const LEFT      = program.getv(operands[1]);
    const RIGHT     = program.getv(operands[2]);

    RESULT.type = Data.TYPEOF.bool;
    RESULT.data = LEFT.data === RIGHT.data;
}
Operation.OPERATION[Operation.TYPEOF["!=="]] =
function (program, operands)
{
    const RESULT    = program.getv(operands[0]);
    const LEFT      = program.getv(operands[1]);
    const RIGHT     = program.getv(operands[2]);

    RESULT.type = Data.TYPEOF.bool;
    RESULT.data = LEFT.data !== RIGHT.data;
}

Operation.OPERATION[Operation.TYPEOF["<"]] =
function (program, operands)
{
    const RESULT    = program.getv(operands[0]);
    const LEFT      = program.getv(operands[1]);
    const RIGHT     = program.getv(operands[2]);

    if (!(
        LEFT.type === Data.TYPEOF.number ||
        LEFT.type === Data.TYPEOF.bool &&
        RIGHT.type === Data.TYPEOF.number ||
        RIGHT.type === Data.TYPEOF.bool
    ))
    {
        program.evoke_error(0);
    }

    RESULT.type = Data.TYPEOF.bool;
    RESULT.data = LEFT.data < RIGHT.data;
}
Operation.OPERATION[Operation.TYPEOF["<="]] =
function (program, operands)
{
    const RESULT    = program.getv(operands[0]);
    const LEFT      = program.getv(operands[1]);
    const RIGHT     = program.getv(operands[2]);

    if (!(
        LEFT.type === Data.TYPEOF.number ||
        LEFT.type === Data.TYPEOF.bool &&
        RIGHT.type === Data.TYPEOF.number ||
        RIGHT.type === Data.TYPEOF.bool
    ))
    {
        program.evoke_error(0);
    }

    RESULT.type = Data.TYPEOF.bool;
    RESULT.data = LEFT.data <= RIGHT.data;
}
Operation.OPERATION[Operation.TYPEOF[">"]] =
function (program, operands)
{
    const RESULT    = program.getv(operands[0]);
    const LEFT      = program.getv(operands[1]);
    const RIGHT     = program.getv(operands[2]);

    if (!(
        LEFT.type === Data.TYPEOF.number ||
        LEFT.type === Data.TYPEOF.bool &&
        RIGHT.type === Data.TYPEOF.number ||
        RIGHT.type === Data.TYPEOF.bool
    ))
    {
        program.evoke_error(0);
    }

    RESULT.type = Data.TYPEOF.bool;
    RESULT.data = LEFT.data > RIGHT.data;
}
Operation.OPERATION[Operation.TYPEOF[">="]] =
function (program, operands)
{
    const RESULT    = program.getv(operands[0]);
    const LEFT      = program.getv(operands[1]);
    const RIGHT     = program.getv(operands[2]);

    if (!(
        LEFT.type === Data.TYPEOF.number ||
        LEFT.type === Data.TYPEOF.bool &&
        RIGHT.type === Data.TYPEOF.number ||
        RIGHT.type === Data.TYPEOF.bool
    ))
    {
        program.evoke_error(0);
    }

    RESULT.type = Data.TYPEOF.bool;
    RESULT.data = LEFT.data >= RIGHT.data;
}

Operation.OPERATION[Operation.TYPEOF["+"]] =
function (program, operands)
{
    const RESULT    = program.getv(operands[0]);
    const LEFT      = program.getv(operands[1]);
    const RIGHT     = program.getv(operands[2]);

    if (!(
        LEFT.type === Data.TYPEOF.bool ||
        LEFT.type === Data.TYPEOF.number ||
        LEFT.type === Data.TYPEOF.string &&
        RIGHT.type === Data.TYPEOF.bool ||
        RIGHT.type === Data.TYPEOF.number ||
        RIGHT.type === Data.TYPEOF.string
    ))
    {
        program.evoke_error(0);
    }

    if (LEFT.type === Data.TYPEOF.string ||
        RIGHT.type === Data.TYPEOF.string
    )
    {
        RESULT.type = Data.TYPEOF.string;
    }
    else
    {
        RESULT.type = Data.TYPEOF.number;
    }
    RESULT.data = LEFT.data + RIGHT.data;
}
Operation.OPERATION[Operation.TYPEOF["-"]] =
function (program, operands)
{
    const RESULT    = program.getv(operands[0]);
    const LEFT      = program.getv(operands[1]);
    const RIGHT     = program.getv(operands[2]);

    if (!(
        LEFT.type === Data.TYPEOF.bool ||
        LEFT.type === Data.TYPEOF.number &&
        RIGHT.type === Data.TYPEOF.bool ||
        RIGHT.type === Data.TYPEOF.number
    ))
    {
        program.evoke_error(0);
    }

    RESULT.type = Data.TYPEOF.number;
    RESULT.data = LEFT.data - RIGHT.data;
}
Operation.OPERATION[Operation.TYPEOF["*"]] =
function (program, operands)
{
    const RESULT    = program.getv(operands[0]);
    const LEFT      = program.getv(operands[1]);
    const RIGHT     = program.getv(operands[2]);
    
    if (LEFT.type === Data.TYPEOF.string)
    {
        if (RIGHT.type !== Data.TYPEOF.number)
        {
            program.evoke_error(0);
        }
        
        RESULT.type = Data.TYPEOF.string;
        RESULT.data = LEFT.data.repeat(RIGHT.data);
        
        return;
    }
    if (LEFT.type === Data.TYPEOF.array)
    {
        if (RIGHT.type !== Data.TYPEOF.number)
        {
            program.evoke_error(0);
        }
        
        const ARRAY = [];
        const SIZE = LEFT.data.length;
        for (let i = 1; i <= RIGHT.data; ++i)
        {
            for (let j = 0; j < SIZE; ++j)
            {
                const VALUE = LEFT.data[j];
                ARRAY.push(new Data(
                    VALUE.type,
                    VALUE.data
                ));
            }
        }
        
        RESULT.type = Data.TYPEOF.array;
        RESULT.data = ARRAY;
        
        return;
    }

    if (!(
        LEFT.type === Data.TYPEOF.bool ||
        LEFT.type === Data.TYPEOF.number &&
        RIGHT.type === Data.TYPEOF.bool ||
        RIGHT.type === Data.TYPEOF.number
    ))
    {
        program.evoke_error(0);
    }

    RESULT.type = Data.TYPEOF.number;
    RESULT.data = LEFT.data * RIGHT.data;
}
Operation.OPERATION[Operation.TYPEOF["/"]] =
function (program, operands)
{
    const RESULT    = program.getv(operands[0]);
    const LEFT      = program.getv(operands[1]);
    const RIGHT     = program.getv(operands[2]);

    if (!(
        LEFT.type === Data.TYPEOF.number &&
        RIGHT.type === Data.TYPEOF.number
    ))
    {
        program.evoke_error(0);
    }

    RESULT.type = Data.TYPEOF.number;
    RESULT.data = LEFT.data / RIGHT.data;
}
Operation.OPERATION[Operation.TYPEOF["//"]] =
function (program, operands)
{
    const RESULT    = program.getv(operands[0]);
    const LEFT      = program.getv(operands[1]);
    const RIGHT     = program.getv(operands[2]);

    if (!(
        LEFT.type === Data.TYPEOF.number &&
        RIGHT.type === Data.TYPEOF.number
    ))
    {
        program.evoke_error(0);
    }

    RESULT.type = Data.TYPEOF.number;
    RESULT.data = Math.trunc(LEFT.data / RIGHT.data);
}
Operation.OPERATION[Operation.TYPEOF["%"]] =
function (program, operands)
{
    const RESULT    = program.getv(operands[0]);
    const LEFT      = program.getv(operands[1]);
    const RIGHT     = program.getv(operands[2]);

    if (!(
        LEFT.type === Data.TYPEOF.number &&
        RIGHT.type === Data.TYPEOF.number
    ))
    {
        program.evoke_error(0);
    }

    RESULT.type = Data.TYPEOF.number;
    RESULT.data = LEFT.data % RIGHT.data;
}

Operation.OPERATION[Operation.TYPEOF["un-"]] =
function (program, operands)
{
    const RESULT    = program.getv(operands[0]);
    const VALUE     = program.getv(operands[1]);

    if (VALUE.type !== Data.TYPEOF.number)
    {
        program.evoke_error(0);
    }

    RESULT.type = Data.TYPEOF.number;
    RESULT.data = -VALUE.data;
}
Operation.OPERATION[Operation.TYPEOF["not"]] =
function (program, operands)
{
    const RESULT    = program.getv(operands[0]);
    const VALUE     = program.getv(operands[1]);

    RESULT.type = Data.TYPEOF.bool;
    RESULT.data = !to_bool(program, VALUE);
}

Operation.OPERATION[Operation.TYPEOF["array_access"]] =
function (program, operands)
{
    const POSITION  = program.getp(operands[0]);
    const ARRAY     = program.getv(operands[1]);
    const INDEX     = program.getv(operands[2]);
    
    if (ARRAY.type !== Data.TYPEOF.array ||
        INDEX.type !== Data.TYPEOF.number
    )
    {
        program.evoke_error(0);
    }
    if (is_correct_index(ARRAY.data, INDEX.data) === false)
    {
        program.evoke_error_message("trying to access incorrect index");
    }
    
    program.stack[POSITION] = ARRAY.data[INDEX.data];
}
Operation.OPERATION[Operation.TYPEOF["slice"]] =
function (program, operands)
{
    const SLICE     = program.getv(operands[0]);
    const SEQUENCE  = program.getv(operands[1]);
    const BEGIN     = program.getv(operands[2]);
    const END       = program.getv(operands[3]);
    
    if (
        SEQUENCE.type !== Data.TYPEOF.string &&
        SEQUENCE.type !== Data.TYPEOF.array ||
        BEGIN.type !== Data.TYPEOF.number ||
        END.type !== Data.TYPEOF.number
    )
    {
        program.evoke_error(0);
    }
    
    SLICE.type = SEQUENCE.type;
    SLICE.data = SEQUENCE.data.slice(BEGIN.data, END.data);
}

Operation.OPERATION[Operation.TYPEOF["member_access"]] =
function (program, operands)
{
    const OBJECT    = program.getv(operands[1]);
    const NAME      = operands[2];
    
    if (OBJECT.type !== Data.TYPEOF.object)
    {
        const RESULT = program.getv(operands[0]);
        
        const METHODS = Operation.DEFAULT_METHODS[OBJECT.type];
        if (METHODS && METHODS.has(NAME))
        {
            RESULT.type = Data.TYPEOF.default_method;
            RESULT.data = [OBJECT, NAME];
            
            return;
        }
        
        program.evoke_error_message(`can't access class member not from class object`);
    }
    
    const CLASS     = OBJECT.data[0].data;
    const MEMBER    = CLASS[NAME];
    const RESULT    = program.getp(operands[0]);
    const STACK     = program.stack;
    
    if (MEMBER.type === Data.TYPEOF.method)
    {
        STACK[RESULT] = structuredClone(MEMBER);
        
        program.object_stack.push(OBJECT);
    }
    else
    {
        STACK[RESULT] = OBJECT.data[MEMBER];
    }
}

Operation.OPERATION[Operation.TYPEOF["create_field"]] =
function (program, operands)
{
    const INDEX     = operands[0];
    const VALUE     = program.getv(operands[1]);
    const OBJECT    = program.object_stack.at(-1);
    
    OBJECT.data[INDEX] = new Data(
        VALUE.type, 
        VALUE.data
    );
}

Operation.OPERATION[Operation.TYPEOF["this"]] =
function (program, operands)
{
    if (program.object_stack.length === 0)
    {
        program.evoke_error_message("can't call this outside class method");
    }
    
    const RESULT = program.getv(operands[0]);
    const OBJECT = program.object_stack.at(-1);
    
    RESULT.type = OBJECT.type;
    RESULT.data = OBJECT.data;
}
Operation.OPERATION[Operation.TYPEOF["new_object"]] =
function (program, operands)
{
    const CLASS         = program.getv(operands[0]);
    const FUNCTION      = CLASS.data["$"].data;
    const FUNCTION_ID   = FUNCTION[1];
    const JUMP          = FUNCTION[0] - 1;
    
    const PARAMETERS = structuredClone(operands[1]);
    for (const INDEX in PARAMETERS)
    {
        PARAMETERS[INDEX] = program.getv(PARAMETERS[INDEX]);
    }
    program.parameter_stack.push(PARAMETERS);
    
    program.function_offset[FUNCTION_ID].push(program.stack.length);
    program.jump_back.push([program.current_operation + 1, FUNCTION_ID]);
    for (let i = 0; i < program.function_memory[FUNCTION_ID]; i += 1)
    {
        program.stack.push(new Data(Data.TYPEOF.null, null));
    }
    
    program.current_operation = JUMP;
    
    program.object_stack.push(new Data(Data.TYPEOF.object, [CLASS]));
}
Operation.OPERATION[Operation.TYPEOF["get_object"]] =
function (program, operands)
{
    const RESULT    = program.getv(operands[0]);
    const OBJECT    = program.object_stack.pop();
    
    RESULT.type = OBJECT.type;
    RESULT.data = OBJECT.data;
}
Operation.OPERATION[Operation.TYPEOF["pop_object"]] =
function (program, operands)
{
    const RESULT        = program.getv(operands[0]);
    const RETURN_VALUE  = program.return_value;
    
    RESULT.type = RETURN_VALUE.type;
    RESULT.data = RETURN_VALUE.data;
    
    program.object_stack.pop();
}

Operation.OPERATION[Operation.TYPEOF["size"]] =
function (program, operands)
{
    const OBJECT = program.object_stack.pop();

    if (
        OBJECT.type !== Data.TYPEOF.string &&
        OBJECT.type !== Data.TYPEOF.array
    )
    {
        program.evoke_error_message(`can't do "size" with not string or array`);
    }

    program.return_value = new Data(
        Data.TYPEOF.number,
        OBJECT.data.length
    );
}
Operation.OPERATION[Operation.TYPEOF["push"]] =
function (program, operands)
{
    const ARRAY         = program.object_stack.pop();
    const PARAMETERS    = operands;
    
    if (PARAMETERS.length != 0)
    {
        var VALUE = PARAMETERS.pop();
    }
    else
    {
        var VALUE = new Data(Data.TYPEOF.null, null);
    }

    ARRAY.data.push(new Data(
        VALUE.type,
        VALUE.data
    ));
    
    program.return_value = VALUE;
}
Operation.OPERATION[Operation.TYPEOF["pop"]] =
function (program, operands)
{
    const ARRAY = program.object_stack.pop();
    
    program.return_value = ARRAY.data.at(-1);
    ARRAY.data.pop();
}
Operation.OPERATION[Operation.TYPEOF["split"]] =
function (program, operands)
{
    const STRING        = program.object_stack.pop();
    const PARAMETERS    = operands;
    
    if (PARAMETERS.length != 0)
    {
        var DELIMETER = PARAMETERS.pop();
    }
    else
    {
        var DELIMETER = new Data(Data.TYPEOF.null, null);
    }
    
    if (DELIMETER.type !== Data.TYPEOF.string)
    {
        program.evoke_error_message(`can't do "split" with not string`);
    }
    
    const ARRAY = STRING.data.split(DELIMETER.data);
    for (const INDEX in ARRAY)
    {
        ARRAY[INDEX] = new Data(Data.TYPEOF.string, ARRAY[INDEX]);
    }
    program.return_value = new Data(
        Data.TYPEOF.array,
        ARRAY
    );
}
Operation.OPERATION[Operation.TYPEOF["join"]] =
function (program, operands)
{
    const ARRAY         = program.object_stack.pop();
    const PARAMETERS    = operands;
    
    if (PARAMETERS.length != 0)
    {
        var DELIMETER = PARAMETERS.pop();
    }
    else
    {
        var DELIMETER = new Data(Data.TYPEOF.null, null);
    }
    
    if (DELIMETER.type !== Data.TYPEOF.string)
    {
        program.evoke_error_message(`can't do "join" with not string`);
    }
    
    const NEW_ARRAY = [];
    for (const ELEMENT of ARRAY.data)
    {
        if (ELEMENT.type !== Data.TYPEOF.string)
        {
            program.evoke_error_message(`can't do "join" with not string`);
        }
        NEW_ARRAY.push(ELEMENT.data);
    }
    program.return_value = new Data(
        Data.TYPEOF.string,
        NEW_ARRAY.join(DELIMETER.data)
    );
}
Operation.OPERATION[Operation.TYPEOF["codeOfChar"]] =
function (program, operands)
{
    const STRING        = program.object_stack.pop();
    const PARAMETERS    = operands;
    
    if (PARAMETERS.length != 0)
    {
        var INDEX = PARAMETERS.pop();
    }
    else
    {
        var INDEX = new Data(Data.TYPEOF.null, null);
    }

    if (
        INDEX.type !== Data.TYPEOF.number ||
        is_correct_index(STRING.data, INDEX.data) === false
    )
    {
        program.evoke_error_message(`incorrect index in default method "codeOfChar"`);
    }

    program.return_value = new Data(
        Data.TYPEOF.number, 
        STRING.data.charCodeAt(INDEX.data)
    );
}

Operation.OPERATION[Operation.TYPEOF["print"]] =
function (program, operands)
{
    for (var index = operands.length - 1; index >= 0; --index)
    {
        program.print(operands[index]);
        if (index > 0)
        {
            addOutput(" ");
        }
    }
    
    program.return_value = new Data(
        Data.TYPEOF.null, 
        null
    );
}
Operation.OPERATION[Operation.TYPEOF["println"]] =
function (program, operands)
{
    for (var index = operands.length - 1; index >= 0; --index)
    {
        program.print(operands[index]);
        if (index > 0)
        {
            addOutput(" ");
        }
    }
    addOutput("\n");
    
    program.return_value = new Data(
        Data.TYPEOF.null, 
        null
    );
}
Operation.OPERATION[Operation.TYPEOF["input"]] =
function (program, operands)
{
    const PARAMETERS = operands;
    
    if (PARAMETERS.length != 0)
    {
        var HINT_TEXT = PARAMETERS.pop();
    }
    else
    {
        var HINT_TEXT = new Data(Data.TYPEOF.null, null);
    }
    
    program.is_end = true;
    
    if (
        HINT_TEXT.type === Data.TYPEOF.bool ||
        HINT_TEXT.type === Data.TYPEOF.number||
        HINT_TEXT.type === Data.TYPEOF.string
    )
    {
        await_input(String(HINT_TEXT.data));
    }
    else
    {
        await_input("");
    }
}

Operation.OPERATION[Operation.TYPEOF["format"]] =
function (program, operands)
{
    const PARAMETERS = operands;
    
    if (PARAMETERS.length != 0)
    {
        var VALUE = PARAMETERS.pop();
    }
    else
    {
        var VALUE = new Data(Data.TYPEOF.null, null);
    }
    
    program.return_value = new Data(
        Data.TYPEOF.string,
        program.get_format(VALUE)
    );
}

Operation.OPERATION[Operation.TYPEOF["clone"]] =
function (program, operands)
{
    const PARAMETERS = operands;
    
    if (PARAMETERS.length != 0)
    {
        var VALUE = PARAMETERS.pop();
    }
    else
    {
        var VALUE = new Data(Data.TYPEOF.null, null);
    }
    
    program.return_value = structuredClone(VALUE);
}

Operation.OPERATION[Operation.TYPEOF["rand"]] =
function (program, operands)
{
    program.return_value = new Data(
        Data.TYPEOF.number,
        Math.random()
    );
}

Operation.OPERATION[Operation.TYPEOF["clock"]] =
function (program, operands)
{
    program.return_value = new Data(
        Data.TYPEOF.number,
        performance.now()
    );
}


Operation.OPERATION[Operation.TYPEOF["is_null"]] =
function (program, operands)
{
    program.return_value = new Data(
        Data.TYPEOF.bool,
        operands[0].type === Data.TYPEOF.null
    );
}
Operation.OPERATION[Operation.TYPEOF["is_bool"]] =
function (program, operands)
{
    program.return_value = new Data(
        Data.TYPEOF.bool,
        operands[0].type === Data.TYPEOF.bool
    );
}
Operation.OPERATION[Operation.TYPEOF["is_number"]] =
function (program, operands)
{
    program.return_value = new Data(
        Data.TYPEOF.bool,
        operands[0].type === Data.TYPEOF.number
    );
}
Operation.OPERATION[Operation.TYPEOF["is_string"]] =
function (program, operands)
{
    program.return_value = new Data(
        Data.TYPEOF.bool,
        operands[0].type === Data.TYPEOF.string
    );
}
Operation.OPERATION[Operation.TYPEOF["is_array"]] =
function (program, operands)
{
    program.return_value = new Data(
        Data.TYPEOF.bool,
        operands[0].type === Data.TYPEOF.array
    );
}
Operation.OPERATION[Operation.TYPEOF["is_object"]] =
function (program, operands)
{
    program.return_value = new Data(
        Data.TYPEOF.bool,
        operands[0].type === Data.TYPEOF.object
    );
}
Operation.OPERATION[Operation.TYPEOF["is_function"]] =
function (program, operands)
{
    program.return_value = new Data(
        Data.TYPEOF.bool,
        operands[0].type === Data.TYPEOF.function ||
        operands[0].type === Data.TYPEOF.default_function ||
        operands[0].type === Data.TYPEOF.method ||
        operands[0].type === Data.TYPEOF.default_method
    );
}

Operation.OPERATION[Operation.TYPEOF["to_bool"]] =
function (program, operands)
{
    const RESULT        = program.getv(operands[0]);
    const EXPRESSION    = program.getv(operands[1]);

    RESULT.type = Data.TYPEOF.bool;
    RESULT.data = to_bool(program, EXPRESSION);
}
Operation.OPERATION[Operation.TYPEOF["to_number"]] =
function (program, operands)
{
    const RESULT        = program.getv(operands[0]);
    const EXPRESSION    = program.getv(operands[1]);

    RESULT.type = Data.TYPEOF.bool;
    RESULT.data = to_number(program, EXPRESSION);
}
Operation.OPERATION[Operation.TYPEOF["to_string"]] =
function (program, operands)
{
    const RESULT        = program.getv(operands[0]);
    const EXPRESSION    = program.getv(operands[1]);

    RESULT.type = Data.TYPEOF.bool;
    RESULT.data = to_string(program, EXPRESSION);
}

Operation.OPERATION[Operation.TYPEOF["exit"]] =
function (program, operands)
{
    program.print(new Data(Data.TYPEOF.string, "\nExit value: "));
    program.print(program.return_value);
    program.print(new Data(Data.TYPEOF.string, "\nRuntime: " + 
    `${precision(program.overall_time + precision(performance.now() - program.time_start))}ms`))
}



function is_correct_index (array, index)
{
    return index % 1 == 0 && index >= 0 && index < array.length;
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
    
    program.evoke_error_message(`unknown type in "to_bool"`);
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
        program.evoke_error_message("can't cast array to number");
    }
    
    program.evoke_error_message( `unknown type in "to_number"`);
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
        program.evoke_error_message( "can't cast array to string");
    }
    
    program.evoke_error_message( `unknown type in "to_string"`);
}