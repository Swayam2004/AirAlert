## VayuBuddy: an LLM-Powered Chatbot to Democratize Air

## Quality Insights

## Zeel B Patel

```
patel_zeel@iitgn.ac.in
IIT Gandhinagar
India
```
## Yash Bachwana

```
yash.bachwana@iitgn.ac.in
IIT Gandhinagar
India
```
## Nitish Sharma

```
nitishsharma1295@gmail.com
Independent Researcher
India
```
## Sarath Guttikunda

```
sguttikunda@gmail.com
UrbanEmmissions.info
India
```
## Nipun Batra

```
nipun.batra@iitgn.ac.in
IIT Gandhinagar
India
```
## a

## b

## c

## d

## e

```
Figure 1: VayuBuddy’s Interface: a) selection of an LLM; b) selecting a prompt; c) question asked by a user; d)
output from VayuBuddy; e) chat input box to ask the questions to VayuBuddy.
```
### ABSTRACT

```
Nearly 6.7 million lives are lost due to air pollution every
year. While policymakers are working on the mitigation
```
```
Permission to make digital or hard copies of all or part of this work for personal or
classroom use is granted without fee provided that copies are not made or distributed
for profit or commercial advantage and that copies bear this notice and the full citation
on the first page. Copyrights for components of this work owned by others than the
author(s) must be honored. Abstracting with credit is permitted. To copy otherwise, or
republish, to post on servers or to redistribute to lists, requires prior specific permission
and/or a fee. Request permissions from permissions@acm.org.
Conference acronym ’XX, June 03–05, 2018, Woodstock, NY,
©2024 Copyright held by the owner/author(s). Publication rights licensed to ACM.
ACM ISBN 978-x-xxxx-xxxx-x/YY/MM... $15.
https://doi.org/10.1145/nnnnnnn.nnnnnnn
```
```
strategies, public awareness can help reduce the exposure to
air pollution. Air pollution data from government-installed-
sensors is often publicly available in raw format, but there
is a non-trivial barrier for various stakeholders in deriving
meaningful insights from that data. In this work, we present
VayuBuddy, a Large Language Model (LLM)-powered chatbot
system to reduce the barrier between the stakeholders and
air quality sensor data. VayuBuddy receives the questions
in natural language, analyses the structured sensory data
with a LLM-generated Python code and provides answers in
natural language. We use the data from Indian government
```
# arXiv:2411.12760v1 [cs.HC] 16 Nov 2024


```
Zeel B Patel, Yash Bachwana, Nitish Sharma, Sarath Guttikunda, and Nipun Batra
```
```
air quality sensors. We benchmark the capabilities of 7 LLMs
on 45 diverse question-answer pairs prepared by us. Addi-
tionally, VayuBuddy can also generate visual analysis such
as line-plots, map plot, bar charts and many others from the
sensory data as we demonstrate in this work.
ACM Reference Format:
Zeel B Patel, Yash Bachwana, Nitish Sharma, Sarath Guttikunda, and Nipun
Batra. 2024. VayuBuddy: an LLM-Powered Chatbot to Democratize Air
Quality Insights. InProceedings of Make sure to enter the correct conference
title from your rights confirmation emai (Conference acronym ’XX).ACM,
New York, NY, USA, 7 pages. https://doi.org/10.1145/nnnnnnn.nnnnnnn
```
Air pollution is one of the most critical environmental health
risks of our time, silently killing over 6.7 million people an-
nually [ 12 ]. Fine particulate matter pollution (PM 2. 5 ) is a
primary pollutant responsible for chronic obstructive pul-
monary disease, lower respiratory infections, stroke, ischemic
heart disease, and various cancers. Additionally, it plays a sig-
nificant role in type 2 diabetes and neonatal disorders^1. Pub-
lic/Media awareness about air pollution is limited since they
are not equipped with the skills to process raw air pollution
data to generate insights. Moreover, a growing literature [ 7 ]
on environmental health literacy suggests that communica-
tion about environmental risks must move beyond individual
behavior education to empower communities to mobilize to
reduce environmental threats. Media sources tend to present
misperception and distortions regarding air quality risks,
leading to a public disconnect from reality [ 3 ]. Moreover,
entertainment media exaggerates risks, contributing to mis-
information [5].
In recent years, advancements to transformer [ 13 ] based
large language models (LLMs) have revolutionized informa-
tion retrieval and processing. Models like GPT [ 1 ], BERT [ 4 ],
and Llama [ 11 ] leverage the transformer architecture to cap-
ture long-range dependencies, processing complex questions
to produce reasonable answers.
In this work, we present our system called VayuBuddy^2
which aims to provide an interface to ask questions about air
pollution in natural language and get the answer in natural
language or visual format. VayuBuddy uses LLMs to convert
natural language user queries into a Python code. The code
is then executed by Python interpreter which has access to
air quality sensor data. The final answer produced by the
code is also in natural language. We use the Central Pollution
Control Board (CPCB) air quality sensor data, specifically
focusing on daily average air quality data, such as pollu-
tant concentrations. Figure 2 shows the flow diagram of our
system.
We employed 7 different LLMs on 45 curated prompts,
focusing on stakeholder needs. We generate these questions
based on discussions with an air quality expert. To evaluate

(^1) https://www.unep.org/interactives/air-pollution-note/
(^2) https://huggingface.co/spaces/SustainabilityLabIITGN/VayuBuddy
Figure 2: Flow Diagram of our VayuBuddy System.
the system performance, we curate queries that can cover a
variety based on: i) output type (plot/text); ii) query hardness;
iii) query type (spatial, temporal, etc.). We add a common
system prompt across LLMs to contextualize questions. For
example, we mentioned the permissible pollution limits in In-
dia and requested the system to show them in the plot while
plotting any time-series data. We can see those thresholds
as dotted lines in Figure 1(d).
We ensured code reproducibility to facilitate transparency
and enable others to replicate our methodology and results.
Our web application can be found at here^3. We believe that
our work will lower the barrier into automatic air quality
sensor data analytics for various stakeholders and overall
help reduce the air pollution for social good.

### 1 RELATED WORK

### 1.1 Chatbots

```
Chatbots have gained significant attention in a last few years.
Various approaches have been explored to develop chatbots
for different domains, including healthcare, customer service,
education, and environmental monitoring [ 2 ]. In addition
to offering real-time communication, chatbots have the po-
tential to inform people about safety precautions, health
dangers, and environmental data [ 6 ]. Our chatbot system
aims to serve various stakeholders such as new media re-
porters, parents, lung patients, think tanks, policymakers,
air quality researchers and general public.
```
(^3) https://ouranonymoussubmission-vayubuddy.hf.space/


```
VayuBuddy: an LLM-Powered Chatbot to Democratize Air Quality Insights
```
### 1.2 Codegen LLMs

‘Codegen LLM’ is an LLM which can generate code for var-
ious programming languages. In numerous programming
tasks, specialized Codegen LLMs—such as OpenAI’s Codex^4 ,
perform well and produce readable and accurate Python
code [ 14 ]. On the other hand, open-source models like CodeL-
lama [8] has been performing at par with the closed source
LLMs. Recent general-purpose LLMs are also showing promis-
ing code-generation capabilities. We benchmark both general-
purpose and code-gen LLMs against hand-curated query-
answer dataset created by us.

### 1.3 LLMs for tabular data

Language models (LLMs) tailored for tabular data processing
have emerged as powerful tools for handling structured data
in a natural language format. These models are designed to
understand and generate text representations of tabular data,
enabling tasks such as data summarisation, querying, and
analysis. Prior research has demonstrated the effectiveness
of LLMs for tabular data in domains such as finance, health-
care, and e-commerce [ 10 , 15 ]. We emphasize that LLMs
which work directly on data are likely to have performance
bottlenecks dependent on the size of the data. On the other
hand, code-generation LLMs do not need to access the data
itself so their performance is independent of the dataset size.

### 1.4 Air Quality Toolkits

Libraries, such as Vayu^5 (for Python) and OpenAir^6 (for R),
help users visualize air-quality data and to generate mean-
ingful insights. Our chatbot acts like a dynamic visualization
library which does not require to be developed explicitly
with software engineering. To improve the performance, it’s
possible to fine-tune the chatbot on hand-generated query-
code pairs.

### 2 DATASET

### 2.1 Air Quality Dataset

```
Our air quality dataset comprises pollution measurements
of PM 2. 5 concentrations. The data is curated from 537 con-
tinuous monitoring stations from 279 cities across 31 states
installed by the Central Pollution Control Board (CPCB),
India. PM 2. 5 is the most hazardous pollutant to health and
thus we primarily focuses on PM2.5 in this work. We have
included 7 years of data from 2017 to 2023. The data is origi-
nally collected every 15 minutes, however for computational
efficiency, we resample it to daily.
```
(^4) https://openai.com/index/openai-codex
(^5) https://sustainability-lab.github.io/vayu/
(^6) https://www.openair.com

### 2.2 Natural Language Prompts Dataset

```
We evaluate the performance of our system using two datasets:
one focused on system capabilities and the other on stake-
holder needs. The strategies for each dataset are as follows:
```
- System End: This dataset includes prompts created by
    authors and air quality experts to evaluate the capabil-
    ity of the system. We categorized the prompts based
    on the type of output they generate, such as numer-
    ical answers, textual answers or plots. Additionally,
    we differentiated prompts by the nature of the queries.
    Sample questions of such categories are presented in
    Table 1.
- Stakeholder End: To create this dataset, we include the
    questions addressing the needs of various stakehold-
    ers. With input from an air quality expert, we collected
    several questions directly from them. For the remain-
    ing questions, we thought from the perspectives of
    various stakeholders. For example, policymakers may
    seek insights into overall pollution trends and com-
    pliance with the air quality standards, while patients
    might inquire about relocating to a city with lower
    pollution levels. Parents may want to understand the
    air pollution exposure of their children during week-
    days. Sample questions from various stakeholders are
    presented in Table 2.

```
Category
(Count)
```
```
Example Prompt
```
```
Plot Output (12) Plot the yearly average PM2.5.
Text Output (8) Which city has the highest PM2.
level in July 2022?
Spatial (11) Which state has the highest average
PM2.5?
Temporal (20) Plot the monthly average PM2.5 of
Delhi.
Raw Time (3) Which city witnessed the lowest
PM2.5?
Aggregated Time
(17)
```
```
Plot the monthly average PM2.5 of
Delhi.
Easy (2) Plot the yearly average PM2.5.
Moderate (12) Which month in which year has the
highest PM2.5 overall?
Complex (6) Plot and compare the monthly aver-
age PM2.5 of Delhi, Mumbai and Ben-
galuru for the year 2022.
```
```
Table 1: Examples of the prompts that can generate a
wide variety of outputs at various difficulty levels. We
include a mix of textual, numerical and visual outputs.
```

```
Zeel B Patel, Yash Bachwana, Nitish Sharma, Sarath Guttikunda, and Nipun Batra
```
Following this procedure, we compiled a diverse set of 45
questions for evaluation. For each question, we manually
wrote the corresponding Python code to retrieve accurate
answers from the dataset.

```
Category Example Prompt
Policymakers Number of cities that had PM2.5 levels
above the WHO guideline in Novem-
ber 2023?
Air Quality Re-
searcher
```
```
Which season (Summer, Winter,
Spring, Autumn) experiences highest
pollution levels?
Lung Patients Which city in India has the best air
quality?
Parents What is the average air pollution on
the weekdays?
Public Which city has the highest PM2.
level in July 2022?
```
Table 2: Example queries involving perspectives and
needs of various stakeholders.

### 2.3 Large Language Models

We compare 7 Open-source LLM models in this work. We
didn’t use any paid LLM to keep the experiments repro-
ducible to the research communities may or may not having
the budget to spend on subscribing the LLMs. We describe
each of the LLMs in brief in the following subsections.

- Llama: Llama-series LLMs from Meta have model sizes
    of 8 and 72 billion parameters with a context window
    of 8192 tokens. They included a tokenizer with a vo-
    cabulary of 128K tokens for more efficient language
    encoding and the adoption of grouped query attention
    (GQA) to enhance inference efficiency. The models
    are trained on sequences of 8192 tokens with mask-
    ing to prevent self-attention from crossing document
    boundaries.We have also included a very recently
    launched model LLama3.1 from Meta AI.
- Mixtral: This is a sparse mixture-of-experts [ 9 ] net-
    work with a model size of 7B (known as Mistral) and
    56 billion parameters and a context window of 32768
    tokens. It utilizes only 13 billion active parameters dur-
    ing inference since it is a sparse mixture of networks.
    The model consists of experts, which are feed-forward
    neural networks, and a gate network or router that
    determines the routing of tokens to different experts.
    This router is pre-trained alongside the rest of the net-
    work.
       - Codestral: Codestral is code specific model from Mis-
          tral AI group with 22B parameters. It is trained on 80+
          programming languages including C, Java and Python.
       - Gemma: A model with the size of 7 billion parame-
          ters and a context window of 8192 tokens adopts key
          improvements such as Multi-Query Attention, RoPE
          Embeddings, GeGLU Activations, and RMSNorm. The
          training process begins with supervised fine-tuning on
          a mix of text-only, English-only synthetic, and human-
          generated prompt-response pairs, followed by rein-
          forcement learning from human feedback (RLHF). The
          reward model is trained on labelled English-only pref-
          erence data, and the policy is based on a set of high-
          quality prompts.

### 2.4 Prompt Engineering

```
Note that LLM models needs to be given some well-engineered
system prompts to get the most out of them. It can include
but is not limited to the type of task, metadata about the
questions, static information (for example, WHO and India
limits of PM 2. 5 .) and answer formats. We provide the meta-
data of the dataset, static information and answer formats in
system prompts. We describe the provided system prompt
in Listing 1.
```
```
Listing 1: System Prompts. Additional information and
direction given to the LLM.
```
- The columns are'Timestamp','station','PM
.5','PM10','address','city','latitude','
longitude',and'state'.
- Frequency of data is daily.
- `pollution`generally means`PM2.5`.
- Don't print anything, but save result in a
variable`answer`and make it global.
- Unless explicitly mentioned, don't consider
the result as a plot.
- PM2.5 guidelines: India: 60, WHO: 15.
- PM10 guidelines: India: 100, WHO: 50.
- If result is a plot, show the India and WHO
guidelines in the plot.
- If result is a plot make it in tight layout,
save it and save path in`answer`. Example:`
answer='plot.png'`
- If result is a plot, rotate x-axis tick labels
    by 45 degrees.
- If result is not a plot, save it as a string
in`answer`. Example:`answer='The city is
Mumbai'`
- I have a geopandas.geodataframe india
containining the coordinates required to plot
Indian Map with states.


```
VayuBuddy: an LLM-Powered Chatbot to Democratize Air Quality Insights
```
- If the query asks you to plot on India Map,
use that geodataframe to plot and then add more
points as per the requirements using the similar
    code as follows : v = ax.scatter(df['longitude
'], df['latitude']). If the colorbar is required
, use the following code : plt.colorbar(v)
- If the query asks you to plot on India Map
plot the India Map in Beige color
- Whenever you do any sort of aggregation,
report the corresponding standard deviation,
standard error and the number of data points for
    that aggregation.
- Whenever you're reporting a floating point
number, round it to 2 decimal places.
- Always report the unit of the data. Example:
The average PM2.5 is 45.67𝜇𝑔𝑚−^3.

### 3 EVALUATION

We now evaluate the efficacy of the different LLMs on the
different prompts.

### 3.1 Experimental Setup

We created an automated evaluation pipeline to accelerate
the evaluation process. We ensured fairness in the evaluation
process by incorporating all the possible ways of correct
answers in the pipeline. We measured the correctness in the
following manner: A score of 1 is assigned if the response
obtained is correct. Any other response is treated as incorrect
and scored 0. There are three possible ways for a response
to be considered incorrect:
(1) LLM failing to generate the code.
(2)The LLM generates the code, but the code gives error
while executing.
(3)The LLM generated code runs without errors but gives
a wrong answer.
We use all the default configurations for the LLMs except
temperature, which is set to 0 to disable randomness in the
answers.

### 3.2 Results

```
In this section we present the results from evaluation on
various LLMs. Table 3 shows the overall scores of LLMs
across all categories. We observe that LLama3.1, which is a
recently released open-source model by Meta, is gaining the
best score. However it is just 1 point ahead of its predecessor,
LLama3. Codestral and Mixtral models are also reasonably
good but perhaps needs a more specific prompt engineering
to increase the performance.
```
```
3.2.1 Analysis.We observe the following points while analysing
the results from various LLMs.
```
```
LLM # params Score (out of 45)
Llama3.1 70B 39
Llama3 70B 38
Codestral 22B 29
Mixtral 56B 26
Llama3.1 8B 23
Llama3 8B 21
Gemma 9B 19
Codestral Mamba 7B 19
Mistral 7B 8
Gemma 7B 7
```
```
Table 3: Overall Performance of LLMs on all evalua-
tion queries. LLama3 models are performing the best
among all models. Codestral and Mixtral are following
LLama in performance. Models with more parameters
are performing well compared to less parameters.
```
#### LLM 1 2 3 4 5

```
Llama3-70b 19 15 16 20 24
Mixtral 15 11 11 15 14
Gemma-7b 2 2 6 6 4
Llama3.1-70b 20 16 16 20 24
Codestral Mamba 8 7 8 9 13
Codestral 14 12 15 18 19
Mistral 7B 5 3 3 3 5
Llama3-8b 11 7 11 14 15
Llama3.1-8b 10 8 12 13 17
Gemma-9b 8 7 12 13 12
```
```
Table 4: Category Wise performance of LLMs. 1 - Pol-
icymakers, 2 - AQ Researcher, 3 - Lung Patients, 4 -
Parents, 5 - Public
```
- We observe that in almost all cases LLMs were able to
    generate either errorless or faulty Python codes. We
    rarely see a case where any code is not generated.
- Llama3 provides a good balance between code genera-
    tion and general knowledge. Code based LLMs failed
    at questions which required prior information about
    lockdown and festival seasons, while models Gemma
    and Mistral lack pretraining on codes.
- Few questions like "How many days in 2023 did Mum-
    bai exceed the WHO’s PM2.5 guidelines?" could not be
    handled by any of the LLM due to the lack of proper


```
Zeel B Patel, Yash Bachwana, Nitish Sharma, Sarath Guttikunda, and Nipun Batra
```
Figure 3: Location of Sensors: This image was gener-
ated by VayuBuddy with the following prompt: "Plot
the locations of the stations on the India Map. Do not
Annotate."

```
Figure 4: This image was generated by VayuBuddy with
the following prompt: "Create a calendar map showing
average PM2.5."
```
```
extraction of feature based knowledge that each city
can have multiple stations.
```
- Gemma and Mistral mostly generate non-working
    Python codes which run into errors. This could be
    attributed to their small parameter size compared to
    other LLMs.
- We showcase three non-trivial prompts (Figure 3, Fig-
    ure 4, and Figure 5) and their corresponding plots gen-
    erated correctly by VayuBuddy. These show the rich-
    ness of the capabilities.

### 4 LIMITATIONS AND FUTURE WORK

- Expanding across countries:In the current work,
    we looked at the air quality from India. In the future, we
    plan to expand by including air quality data from other

```
Figure 5: This image was generated by VayuBuddy with
the following prompt: "Plot the choropleth map show-
ing PM10 levels across India, with different colours
representing different AQI categories (e.g., Good, Mod-
erate, Unhealthy, etc.)"
```
```
countries. We plan to source the data from OpenAQ^7
platform. Unfortunately due to some changes in the
CPCB operation, OpenAQ does not presently provide
Indian pollution data. Going beyond a single country’s
data might introduce additional challenges, and we
may need to introduce a meta model to route to a
model for a specific country.
```
- Expanding to text data:We aim to enhance VayuBuddy’s
    capabilities to additionally answer queries based on
    text inputs. These could include various advisories
    from pollution control boards.
- Expanding to additional output types:In our ini-
    tial testing we found that we can also generate plots
    from our VayuBuddy system. However, evaluating the
    correctness of such plots would need a purpose-built
    rubric. We plan to study such output types in the fu-
    ture.
- Extending Feature Categories:We plan to include
    more categories of features such as other pollutants
    like SO 2 , NO 2 , NO, CO, and Ozone. Along with that,
    we plan to add important meteorological parameters
    such as wind (direction and speed).

(^7) https://openaq.org/


VayuBuddy: an LLM-Powered Chatbot to Democratize Air Quality Insights

- Enhancing Prompting Methods:Our work currently
    relies on zero shot prompting, which involves prompt-
    ing the model without specific examples. In the fu-
    ture, we plan to evaluate other strategies like chain of
    thought, tree of thought, and react prompting. These
    approaches encourage deeper consideration before
    generating responses, potentially refining VayuBuddy’s
    ability to offer nuanced insights on air quality-related
    queries.
- Finetuning:Our current work has looked into zero-
    shot performance. In the future, we plan to study the
    finetuning performance of our models.
- Implementing Active Learning Strategies:Another
    innovative approach for enhancing VayuBuddy’s ca-
    pabilities is exploring active learning strategies. By
    integrating active learning methodologies, VayuBuddy
    can intelligently select a set of prompts, optimising the
    training process and improving model performance
    over time. Active learning techniques can enhance
    VayuBuddy’s adaptability to new data and user inter-
    actions.
- Automating Library Installation:To streamline the
    user experience and enhance the autonomy of VayuBuddy,
    a methodology for automated library installation could
    be developed. Instead of requiring users/us to manu-
    ally install libraries and provide them to the model,
    VayuBuddy could autonomously identify the neces-
    sary libraries based on the user’s query and install
    them as needed. This solution would simplify the user
    interaction process and improve the efficiency and
    accessibility of VayuBuddy allowing users to seam-
    lessly access air quality insights without the burden
    of manual setup.

### 5 CONCLUSION

In this work, we explored our system VayuBuddyto respond
to natural language queries pertaining to air pollution based
on data from CPCB. We believe that a system such as ours
can be used by various stakeholders including but not limited
to pollution control boards, researchers. Such systems put
the focus back on the problem or the question being asked
rather than the engineering efforts towards solving the query
to extract the data. In our initial discussions with various air
quality experts, the response has been positive. We plan to
roll this to more stakeholders.

### REFERENCES

```
[1]Tom B Brown. 2020. Language models are few-shot learners.arXiv preprint
arXiv:2005.14165(2020).
[2]Lara Christoforakos, Nina Feicht, Simone Hinkofer, Annalena Löscher, Sonja F
Schlegl, and Sarah Diefenbach. 2021. Connect with me. exploring influencing
factors in a human-technology relationship based on regular chatbot use.Frontiers
in digital health3 (2021), 689999.
```
```
[3]Ricardo Cisneros, Paul Brown, Linda Cameron, Erin Gaab, Mariaelena Gonzalez,
Steven Ramondt, David Veloz, Anna Song, and Don Schweizer. 2017. Understand-
ing public views about air quality and air pollution sources in the San Joaquin
Valley, California.Journal of Environmental and Public Health2017 (2017).
[4]Jacob Devlin, Ming-Wei Chang, Kenton Lee, and Kristina Toutanova. 2019. BERT:
Pre-training of Deep Bidirectional Transformers for Language Understanding.
arXiv:1810.04805 [cs.CL]
[5]Christopher Frayling. 2013.Mad, bad and dangerous?: the scientist and the cinema.
Reaktion books.
[6]M.N Nuha, G.K.N.P Wishvajith, Amitha Caldera, N.T Weerasinghe, G.S Weer-
atunga, and Shashika Lokuliyana. 2023. Predicting the Air Pollution Level and
Creating an Awareness Platform. In2023 5th International Conference on Advance-
ments in Computing (ICAC). 137–142. https://doi.org/10.1109/ICAC60630.2023.
10417387
[7]A Susana Ramírez, Steven Ramondt, Karina Van Bogart, and Raquel Perez-Zuniga.
```
2019. Public awareness of air pollution and health threats: challenges and oppor-
tunities for communication strategies to improve environmental health literacy.
Journal of Health Communication24, 1 (2019), 75–83.
[8]Baptiste Roziere, Jonas Gehring, Fabian Gloeckle, Sten Sootla, Itai Gat, Xiao-
qing Ellen Tan, Yossi Adi, Jingyu Liu, Romain Sauvestre, Tal Remez, et al.2023.
Code llama: Open foundation models for code.arXiv preprint arXiv:2308.
(2023).
[9]Omar Sanseviero, Lewis Tunstall, Philipp Schmid, Sourab Mangrulkar, Younes
Belkada, and Pedro Cuenca. 2023. Mixture of Experts Explained. https://
huggingface.co/blog/moe
[10]Yuan Sui, Mengyu Zhou, Mingjie Zhou, Shi Han, and Dongmei Zhang. 2024. Table
Meets LLM: Can Large Language Models Understand Structured Table Data? A
Benchmark and Empirical Study. InProceedings of the 17th ACM International Con-
ference on Web Search and Data Mining(<conf-loc>, <city>Merida</city>, <coun-
try>Mexico</country>, </conf-loc>)(WSDM ’24). Association for Computing Ma-
chinery, New York, NY, USA, 645–654. https://doi.org/10.1145/3616855.
[11]Hugo Touvron, Thibaut Lavril, Gautier Izacard, Xavier Martinet, Marie-Anne
Lachaux, Timothée Lacroix, Baptiste Rozière, Naman Goyal, Eric Hambro,
Faisal Azhar, Aurelien Rodriguez, Armand Joulin, Edouard Grave, and Guil-
laume Lample. 2023. LLaMA: Open and Efficient Foundation Language Models.
arXiv:2302.13971 [cs.CL]
[12]UNEP. 2019. Emissions Gap Report 2019.United Nations Environment Programme
(11 2019), 1–11.
[13]Ashish Vaswani, Noam Shazeer, Niki Parmar, Jakob Uszkoreit, Llion Jones,
Aidan N. Gomez, Lukasz Kaiser, and Illia Polosukhin. 2023. Attention Is All
You Need. arXiv:1706.03762 [cs.CL]
[14]Michel Wermelinger. 2023. Using GitHub Copilot to Solve Simple Program-
ming Problems. InProceedings of the 54th ACM Technical Symposium on Com-
puter Science Education V. 1(<conf-loc>, <city>Toronto ON</city>, <coun-
try>Canada</country>, </conf-loc>)(SIGCSE 2023). Association for Comput-
ing Machinery, New York, NY, USA, 172–178. https://doi.org/10.1145/3545945.
3569830
[15]Yazheng Yang, Yuqi Wang, Sankalok Sen, Lei Li, and Qi Liu. 2024. Unleashing the
Potential of Large Language Models for Predictive Tabular Tasks in Data Science.
arXiv:2403.20208 [cs.LG]



