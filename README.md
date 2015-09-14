# A Pint-sized Earley Parser #

Many people have said that convenient parser generation is a
game-changing technology.  In his talk _To Trap a Better Mouse_, Ian
Piumarta [suggested][1] that the Earley algorithm is a good place to
start because it handles full context-free grammars and is fairly
trivial to implement.  But some parts of the algorithm (particularly the
construction of the parse forest) don't seem to have good descriptions
which are easily accessible to non-experts.

So this is an attempt to fill that gap: a trivial realization of the
algorithm, suitable for implementation in an afternoon, and with an
annotated version for easy understanding and porting.  I'm deliberately
being fairly concise: for a more detailed description, see Loup
Vaillant-David's [Earley Parsing Explained][2] which goes into far more
detail.

[1]: https://youtu.be/EGeN2IC7N0Q?t=41m
[2]: http://loup-vaillant.fr/tutorials/earley-parsing/
