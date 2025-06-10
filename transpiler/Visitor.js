
class Code
{
    text = "";  
    
    constructor ()
    {
        var default_code =
        [
            ``,
            ``,
        ]
        
        for (const LINE of default_code)
        {
            this.text += LINE + "\n";
        }
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

class Visitor
{
    static VISIT_RULE = {}
    
    scope_tree     = [new Scope(-1)];
    current_scope  = 0;
    
    code            = new Code();

    visit (parent, arg, child)
    {
        const NODE = parent.children[child - 1];

        if (Visitor.VISIT_RULE.hasOwnProperty(NODE.rule_name))
        {
            // DEBUG
            
            // console.log(`${NODE.rule_name}`) 
            
            // DEBUG
            Visitor.VISIT_RULE[NODE.rule_name](this, NODE, arg);
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
                Visitor.VISIT_RULE[NODE.rule_name](this, NODE, arg);
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
    visitor.addText("\n");
    
    visitor.addText("    ".repeat(arg));
    visitor.visit(node, arg, 1);
    visitor.addText("\n");
    
    visitor.visit(node, arg + 1, 2);
    
    visitor.addText("    ".repeat(arg));
    visitor.visit(node, arg, 3);
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
    visitor.visit(node, arg, 1);
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
    visitor.visit_all(node, arg);
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
    visitor.visit_all(node, arg);
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

Visitor.VISIT_RULE["Parameters"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["$Parameters"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}

Visitor.VISIT_RULE["Null"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["Boolean"] = 
function (visitor, node, arg)
{
    if (length_is(node, 1))
    {
        visitor.visit_all(node, arg);
    }
    else
    {
        visitor.addText("new Boolean(");
        visitor.visit(node, arg, 3);
        visitor.addText(")");
    }
}
Visitor.VISIT_RULE["Number"] = 
function (visitor, node, arg)
{
    if (length_is(node, 1))
    {
        visitor.visit_all(node, arg);
    }
    else
    {
        visitor.addText("new Number(");
        visitor.visit(node, arg, 3);
        visitor.addText(")");
    }
}
Visitor.VISIT_RULE["String"] = 
function (visitor, node, arg)
{
    if (length_is(node, 1))
    {
        visitor.visit_all(node, arg);
    }
    else
    {
        visitor.addText("new String(");
        visitor.visit(node, arg, 3);
        visitor.addText(")");
    }
}
Visitor.VISIT_RULE["Array"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["$Array"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}
Visitor.VISIT_RULE["$$Array"] = 
function (visitor, node, arg)
{
    visitor.visit_all(node, arg);
}



function length_is (node, length)
{
    return length === node.children.length;
}
function name_of (node, child)
{
    return node.children[child - 1].rule_name;
}