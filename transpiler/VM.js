class Program
{
    code = new Code();

    constructor (parse_tree) 
    {
        const VISITOR = new Visitor(this.operations);

        Visitor.VISIT_RULE["Program"](VISITOR, parse_tree, null);
    }

    run ()
    {
        console.log(coe.text);
        eval(code.text);
    }
}