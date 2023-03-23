import { Color4 } from '@dcl/sdk/math';
import ReactEcs, { UiEntity, Label, Input, Dropdown } from '@dcl/sdk/react-ecs';
export const uiComponent = () => (ReactEcs.createElement(UiEntity, { uiTransform: {
        width: 700,
        height: 400,
        margin: { top: '35px', left: '500px' }
    }, uiBackground: { color: Color4.create(0.5, 0.8, 0.1, 0.6) } },
    ReactEcs.createElement(UiEntity, { onMouseDown: () => { }, uiTransform: {
            width: '100%',
            height: '20%',
            justifyContent: 'center',
            alignItems: 'center',
            display: 'flex'
        } },
        ReactEcs.createElement(Dropdown, { uiBackground: {
                color: Color4.Blue()
            }, color: Color4.Red(), options: ['BOEDO', 'CASLA'], uiTransform: { width: 200, height: 36 }, onChange: (e) => {
                console.log(e);
            } }),
        ReactEcs.createElement(Input, { placeholder: 'SARASA', onChange: (value) => {
                console.log({ value });
            }, uiBackground: {
                color: Color4.Red()
            }, uiTransform: { width: 200, height: 36 } }),
        ReactEcs.createElement(Label, { value: 'SDK 7', fontSize: 80, uiBackground: { color: Color4.fromHexString('#fbf0f0') } })),
    ReactEcs.createElement(UiEntity, { uiTransform: {
            width: '100%',
            height: '20%',
            justifyContent: 'center',
            alignItems: 'center',
            display: 'flex'
        } },
        ReactEcs.createElement(Label, { value: `Counter:`, fontSize: 60, uiBackground: { color: Color4.fromHexString('#fbf0f0') } })),
    ReactEcs.createElement(UiEntity, { uiTransform: {
            width: '100%',
            height: '100px',
            justifyContent: 'center',
            alignItems: 'center',
            display: 'flex'
        } },
        ReactEcs.createElement(Label, { value: `Player:`, fontSize: 40, uiBackground: { color: Color4.fromHexString('#fbf0f0') } }))));
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidWkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1aS50c3giXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUEsT0FBTyxFQUFFLE1BQU0sRUFBRSxNQUFNLGVBQWUsQ0FBQTtBQUN0QyxPQUFPLFFBQVEsRUFBRSxFQUFFLFFBQVEsRUFBRSxLQUFLLEVBQUUsS0FBSyxFQUFFLFFBQVEsRUFBRSxNQUFNLG9CQUFvQixDQUFBO0FBRS9FLE1BQU0sQ0FBQyxNQUFNLFdBQVcsR0FBRyxHQUFHLEVBQUUsQ0FBQyxDQUMvQix1QkFBQyxRQUFRLElBQ1AsV0FBVyxFQUFFO1FBQ1gsS0FBSyxFQUFFLEdBQUc7UUFDVixNQUFNLEVBQUUsR0FBRztRQUNYLE1BQU0sRUFBRSxFQUFFLEdBQUcsRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE9BQU8sRUFBRTtLQUN2QyxFQUNELFlBQVksRUFBRSxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsTUFBTSxDQUFDLEdBQUcsRUFBRSxHQUFHLEVBQUUsR0FBRyxFQUFFLEdBQUcsQ0FBQyxFQUFFO0lBRTFELHVCQUFDLFFBQVEsSUFDUCxXQUFXLEVBQUUsR0FBRyxFQUFFLEdBQUUsQ0FBQyxFQUNyQixXQUFXLEVBQUU7WUFDWCxLQUFLLEVBQUUsTUFBTTtZQUNiLE1BQU0sRUFBRSxLQUFLO1lBQ2IsY0FBYyxFQUFFLFFBQVE7WUFDeEIsVUFBVSxFQUFFLFFBQVE7WUFDcEIsT0FBTyxFQUFFLE1BQU07U0FDaEI7UUFFRCx1QkFBQyxRQUFRLElBQ1AsWUFBWSxFQUFFO2dCQUNaLEtBQUssRUFBRSxNQUFNLENBQUMsSUFBSSxFQUFFO2FBQ3JCLEVBQ0QsS0FBSyxFQUFFLE1BQU0sQ0FBQyxHQUFHLEVBQUUsRUFDbkIsT0FBTyxFQUFFLENBQUMsT0FBTyxFQUFFLE9BQU8sQ0FBQyxFQUMzQixXQUFXLEVBQUUsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsRUFDdkMsUUFBUSxFQUFFLENBQUMsQ0FBQyxFQUFFLEVBQUU7Z0JBQ2QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQTtZQUNoQixDQUFDLEdBQ0Q7UUFDRix1QkFBQyxLQUFLLElBQ0osV0FBVyxFQUFFLFFBQVEsRUFDckIsUUFBUSxFQUFFLENBQUMsS0FBSyxFQUFFLEVBQUU7Z0JBQ2xCLE9BQU8sQ0FBQyxHQUFHLENBQUMsRUFBRSxLQUFLLEVBQUUsQ0FBQyxDQUFBO1lBQ3hCLENBQUMsRUFDRCxZQUFZLEVBQUU7Z0JBQ1osS0FBSyxFQUFFLE1BQU0sQ0FBQyxHQUFHLEVBQUU7YUFDcEIsRUFDRCxXQUFXLEVBQUUsRUFBRSxLQUFLLEVBQUUsR0FBRyxFQUFFLE1BQU0sRUFBRSxFQUFFLEVBQUUsR0FDdkM7UUFDRix1QkFBQyxLQUFLLElBQUMsS0FBSyxFQUFFLE9BQU8sRUFBRSxRQUFRLEVBQUUsRUFBRSxFQUFFLFlBQVksRUFBRSxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEdBQUksQ0FDeEY7SUFDWCx1QkFBQyxRQUFRLElBQ1AsV0FBVyxFQUFFO1lBQ1gsS0FBSyxFQUFFLE1BQU07WUFDYixNQUFNLEVBQUUsS0FBSztZQUNiLGNBQWMsRUFBRSxRQUFRO1lBQ3hCLFVBQVUsRUFBRSxRQUFRO1lBQ3BCLE9BQU8sRUFBRSxNQUFNO1NBQ2hCO1FBRUQsdUJBQUMsS0FBSyxJQUFDLEtBQUssRUFBRSxVQUFVLEVBQUUsUUFBUSxFQUFFLEVBQUUsRUFBRSxZQUFZLEVBQUUsRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsRUFBRSxHQUFJLENBQzNGO0lBQ1gsdUJBQUMsUUFBUSxJQUNQLFdBQVcsRUFBRTtZQUNYLEtBQUssRUFBRSxNQUFNO1lBQ2IsTUFBTSxFQUFFLE9BQU87WUFDZixjQUFjLEVBQUUsUUFBUTtZQUN4QixVQUFVLEVBQUUsUUFBUTtZQUNwQixPQUFPLEVBQUUsTUFBTTtTQUNoQjtRQUVELHVCQUFDLEtBQUssSUFBQyxLQUFLLEVBQUUsU0FBUyxFQUFFLFFBQVEsRUFBRSxFQUFFLEVBQUUsWUFBWSxFQUFFLEVBQUUsS0FBSyxFQUFFLE1BQU0sQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLEVBQUUsR0FBSSxDQUMxRixDQUNGLENBQ1osQ0FBQSIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IENvbG9yNCB9IGZyb20gJ0BkY2wvc2RrL21hdGgnXG5pbXBvcnQgUmVhY3RFY3MsIHsgVWlFbnRpdHksIExhYmVsLCBJbnB1dCwgRHJvcGRvd24gfSBmcm9tICdAZGNsL3Nkay9yZWFjdC1lY3MnXG5cbmV4cG9ydCBjb25zdCB1aUNvbXBvbmVudCA9ICgpID0+IChcbiAgPFVpRW50aXR5XG4gICAgdWlUcmFuc2Zvcm09e3tcbiAgICAgIHdpZHRoOiA3MDAsXG4gICAgICBoZWlnaHQ6IDQwMCxcbiAgICAgIG1hcmdpbjogeyB0b3A6ICczNXB4JywgbGVmdDogJzUwMHB4JyB9XG4gICAgfX1cbiAgICB1aUJhY2tncm91bmQ9e3sgY29sb3I6IENvbG9yNC5jcmVhdGUoMC41LCAwLjgsIDAuMSwgMC42KSB9fVxuICA+XG4gICAgPFVpRW50aXR5XG4gICAgICBvbk1vdXNlRG93bj17KCkgPT4ge319XG4gICAgICB1aVRyYW5zZm9ybT17e1xuICAgICAgICB3aWR0aDogJzEwMCUnLFxuICAgICAgICBoZWlnaHQ6ICcyMCUnLFxuICAgICAgICBqdXN0aWZ5Q29udGVudDogJ2NlbnRlcicsXG4gICAgICAgIGFsaWduSXRlbXM6ICdjZW50ZXInLFxuICAgICAgICBkaXNwbGF5OiAnZmxleCdcbiAgICAgIH19XG4gICAgPlxuICAgICAgPERyb3Bkb3duXG4gICAgICAgIHVpQmFja2dyb3VuZD17e1xuICAgICAgICAgIGNvbG9yOiBDb2xvcjQuQmx1ZSgpXG4gICAgICAgIH19XG4gICAgICAgIGNvbG9yPXtDb2xvcjQuUmVkKCl9XG4gICAgICAgIG9wdGlvbnM9e1snQk9FRE8nLCAnQ0FTTEEnXX1cbiAgICAgICAgdWlUcmFuc2Zvcm09e3sgd2lkdGg6IDIwMCwgaGVpZ2h0OiAzNiB9fVxuICAgICAgICBvbkNoYW5nZT17KGUpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmxvZyhlKVxuICAgICAgICB9fVxuICAgICAgLz5cbiAgICAgIDxJbnB1dFxuICAgICAgICBwbGFjZWhvbGRlcj17J1NBUkFTQSd9XG4gICAgICAgIG9uQ2hhbmdlPXsodmFsdWUpID0+IHtcbiAgICAgICAgICBjb25zb2xlLmxvZyh7IHZhbHVlIH0pXG4gICAgICAgIH19XG4gICAgICAgIHVpQmFja2dyb3VuZD17e1xuICAgICAgICAgIGNvbG9yOiBDb2xvcjQuUmVkKClcbiAgICAgICAgfX1cbiAgICAgICAgdWlUcmFuc2Zvcm09e3sgd2lkdGg6IDIwMCwgaGVpZ2h0OiAzNiB9fVxuICAgICAgLz5cbiAgICAgIDxMYWJlbCB2YWx1ZT17J1NESyA3J30gZm9udFNpemU9ezgwfSB1aUJhY2tncm91bmQ9e3sgY29sb3I6IENvbG9yNC5mcm9tSGV4U3RyaW5nKCcjZmJmMGYwJykgfX0gLz5cbiAgICA8L1VpRW50aXR5PlxuICAgIDxVaUVudGl0eVxuICAgICAgdWlUcmFuc2Zvcm09e3tcbiAgICAgICAgd2lkdGg6ICcxMDAlJyxcbiAgICAgICAgaGVpZ2h0OiAnMjAlJyxcbiAgICAgICAganVzdGlmeUNvbnRlbnQ6ICdjZW50ZXInLFxuICAgICAgICBhbGlnbkl0ZW1zOiAnY2VudGVyJyxcbiAgICAgICAgZGlzcGxheTogJ2ZsZXgnXG4gICAgICB9fVxuICAgID5cbiAgICAgIDxMYWJlbCB2YWx1ZT17YENvdW50ZXI6YH0gZm9udFNpemU9ezYwfSB1aUJhY2tncm91bmQ9e3sgY29sb3I6IENvbG9yNC5mcm9tSGV4U3RyaW5nKCcjZmJmMGYwJykgfX0gLz5cbiAgICA8L1VpRW50aXR5PlxuICAgIDxVaUVudGl0eVxuICAgICAgdWlUcmFuc2Zvcm09e3tcbiAgICAgICAgd2lkdGg6ICcxMDAlJyxcbiAgICAgICAgaGVpZ2h0OiAnMTAwcHgnLFxuICAgICAgICBqdXN0aWZ5Q29udGVudDogJ2NlbnRlcicsXG4gICAgICAgIGFsaWduSXRlbXM6ICdjZW50ZXInLFxuICAgICAgICBkaXNwbGF5OiAnZmxleCdcbiAgICAgIH19XG4gICAgPlxuICAgICAgPExhYmVsIHZhbHVlPXtgUGxheWVyOmB9IGZvbnRTaXplPXs0MH0gdWlCYWNrZ3JvdW5kPXt7IGNvbG9yOiBDb2xvcjQuZnJvbUhleFN0cmluZygnI2ZiZjBmMCcpIH19IC8+XG4gICAgPC9VaUVudGl0eT5cbiAgPC9VaUVudGl0eT5cbilcbiJdfQ==