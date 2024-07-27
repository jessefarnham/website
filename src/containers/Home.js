import React from 'react'
import "./Home.css"
import FireflyInPA from './fireflyInPA.jpg';

export default function Home() {
    return (
        <div className="Home">
            <div className="lander">
                <h2>Jesse Farnham, Ph.D.</h2>
                <h4>Professional overview</h4>
                <p>I am a software engineer working in the finance industry.
                   I am currently a lead quantitative developer on the commodities team at { }
                   <a href="http://www.citadel.com">Citadel</a> in Greenwich, CT.
                   I work primarily in Python and have experience with Scala.
                   My primary engineering interests are systems and API design;
		   my current business focus is the modeling and pricing of 
                   exotic structured commodity derivatives. Previously, I worked
		   on market analytics for natural gas in North America.
                </p>
                <p>
                  I began my software engineering career
                  as a quantitative developer at <a href="http://www.aqr.com">AQR Capital</a>.
                  Previously, I interned at Google,
                  where I prototyped a biological data standardization pipeline.
                </p>
                <p>
                  Before becoming a software engineer, I studied computational biology.
                  I completed my Ph.D. in computer science, working in { }
                  <a href="http://www.cs.princeton.edu/~mona">Mona Singh's lab</a> { }
                  at Princeton University.
                  My dissertation work investigated protein organization and
                  function acquisition with gene expression and protein physical
                  interaction data. I double-majored in computer science and molecular biology
                  at Wesleyan University;
                  my senior thesis there was advised by { }
                  <a href="http://cs.colby.edu/eaaron/">Eric Aaron</a> { }
                  and investigated performance enhancements for tumor simulations.
                </p>
                <h4>Technology Interests</h4>
                <p>
                I am always interested in improving my knowledge of the technology world.
		Most recently I have been learning about low-level software engineering by
		attempting to implement <a href="https://github.com/jessefarnham/apple2/blob/main/main.s">
		Tetris in Apple 6502 assembly language</a> 
	        and by studying the 
		<a href="https://www.amazon.com/Lions-Commentary-Unix-John/dp/1573980137">
		source code of the UNIX operating system</a>.
                </p>
                <h4>Other Interests</h4>
                <p>
                My main non-work interests involve aviation and being outdoors. I own and fly
                a 1946 Cessna 140, "The Firefly;" click "Flight Status" above to see where I
                have flown recently. I also enjoy flying R/C gliders,
                birding, hiking, backpacking, mountainbiking, scuba diving,
                winter sports,
                and trying unsuccessfully to beat my wife in board games and Rummy.
                </p>
                <img src={FireflyInPA} alt="The Firefly on the ground"
                 className="img-fluid"/>
                <hr/>
                <footer>
                This page was last modified on July 27, 2024.
                </footer>
            </div>
        </div>
    )
}
