import Generator from '../Generator';
import Scope from '../Scope';
export default interface Expression {
    /*
    determines if expression is constant or if it depends on variables
    */
    isConstant(): boolean;

    /*
    if possible
    expression is evaluated
    and simplified expression is returned
    @param scope: scope used to resolve variables
    @param gen: generator used to evaluate functions
    @return possibly simplified version of expression
    */
    eval(scope: Scope, gen: Generator): Expression;
}
