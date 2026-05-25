from deepeval import assert_test
from deepeval.metrics import AnswerRelevancyMetric
from deepeval.test_case import LLMTestCase

from blog_generator import generate_blog

def test_ai_blog_writer():

    prompt = """
    Write a blog about benefits of remote work for startups.
    Include:
    - productivity
    - hiring advantages
    - cost savings
    """

    output = generate_blog(prompt)

    test_case = LLMTestCase(
        input=prompt,
        actual_output=output
    )

    metric = AnswerRelevancyMetric(
        threshold=0.7
    )

    assert_test(test_case, [metric])